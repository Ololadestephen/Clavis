"use client";

import { Clock3, FileUp, LockKeyhole, ShieldCheck, TimerReset, Type, UsersRound } from "lucide-react";
import { useRef, useState } from "react";
import type { Address } from "viem";
import { friendlyError } from "../components/friendlyErrors";
import { saveLastCreatedVault } from "../components/vaultStorage";
import { activeClavisAddress, sealVaultWithCdr } from "./cdrBrowser";

const maxDirectCdrPayloadBytes = 500;
const maxFileBytes = 1024 * 1024;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clavis-rust.vercel.app";

type SecretMode = "note" | "file";
type DurationUnit = "minutes" | "hours" | "days" | "months" | "years";
type InviteDetails = {
  vaultId: string;
  uuid: number;
};

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function cleanAddress(value: string) {
  return value.trim().toLowerCase();
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function friendlySealError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("exceeds max 1024 bytes") || message.includes("ContentSizeExceeded")) {
    return "This file is too large for direct CDR storage on the current testnet. Use a small note for this flow, or wire IPFS/Filecoin storage for larger files.";
  }
  if (message.includes("User rejected") || message.includes("rejected")) {
    return "Wallet confirmation was cancelled.";
  }
  if (message.includes("insufficient funds")) {
    return "This wallet does not have enough IP to pay the transaction fee.";
  }
  if (message.includes("InvalidBeneficiary")) {
    return "The beneficiary wallet is invalid.";
  }
  if (message.includes("InvalidGuardian") || message.includes("DuplicateGuardian")) {
    return "Check the guardian wallets. They must be valid, unique addresses.";
  }
  if (message.includes("InvalidThreshold")) {
    return "The guardian threshold must be between 1 and the number of guardians.";
  }
  return friendlyError(error, "Could not seal vault. Please check the form and try again.");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function encryptFileForIpfs(file: File) {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await file.arrayBuffer());
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return {
    encryptedBytes: new Uint8Array(encrypted),
    keyHex: bytesToHex(rawKey),
    ivHex: bytesToHex(iv),
  };
}

async function uploadEncryptedFileToIpfs(fileName: string, encryptedBytes: Uint8Array) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([encryptedBytes], { type: "application/octet-stream" }),
    `${fileName}.clavis.enc`,
  );

  const response = await fetch("/api/ipfs/upload", {
    method: "POST",
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error ?? "Encrypted file upload to IPFS failed.");
  }
  return body as { cid: string; gatewayUrl: string; size: number };
}

function durationToSeconds(value: number, unit: DurationUnit) {
  const unitSeconds: Record<DurationUnit, number> = {
    minutes: 60,
    hours: 60 * 60,
    days: 24 * 60 * 60,
    months: 30 * 24 * 60 * 60,
    years: 365 * 24 * 60 * 60,
  };
  return Math.floor(value * unitSeconds[unit]);
}

function formatDuration(value: string, unit: DurationUnit) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return `0 ${unit}`;
  const label = amount === 1 ? unit.slice(0, -1) : unit;
  return `${amount} ${label}`;
}

export function CreateVaultForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SecretMode>("note");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [beneficiary, setBeneficiary] = useState("");
  const [guardianOne, setGuardianOne] = useState("");
  const [guardianTwo, setGuardianTwo] = useState("");
  const [guardianThree, setGuardianThree] = useState("");
  const [threshold, setThreshold] = useState("2");
  const [heartbeatValue, setHeartbeatValue] = useState("30");
  const [heartbeatUnit, setHeartbeatUnit] = useState<DurationUnit>("days");
  const [unlockDelayValue, setUnlockDelayValue] = useState("24");
  const [unlockDelayUnit, setUnlockDelayUnit] = useState<DurationUnit>("hours");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [copiedInvite, setCopiedInvite] = useState("");

  const guardians = [guardianOne, guardianTwo, guardianThree].map(cleanAddress).filter(Boolean);
  const fileSize = file ? formatBytes(file.size) : "";
  const heartbeatLabel = formatDuration(heartbeatValue, heartbeatUnit);
  const unlockDelayLabel = Number(unlockDelayValue) === 0 ? "no final delay" : formatDuration(unlockDelayValue, unlockDelayUnit);

  async function sealVault() {
    setError("");
    setStatus("");
    setTxHash([]);

    if (!window.ethereum) {
      setError("No wallet found. Connect MetaMask, Rabby, or OKX Wallet.");
      return;
    }

    if (mode === "note" && !note.trim()) {
      setError("Add a note or switch to file upload.");
      return;
    }

    if (mode === "file" && !file) {
      setError("Choose a private file first.");
      return;
    }

    if (!isAddress(beneficiary)) {
      setError("Enter a valid beneficiary wallet.");
      return;
    }

    if (guardians.length !== 3 || guardians.some((guardian) => !isAddress(guardian))) {
      setError("Enter three valid guardian wallets.");
      return;
    }

    const thresholdNumber = Number(threshold);
    const heartbeatNumber = Number(heartbeatValue);
    const unlockDelayNumber = Number(unlockDelayValue);

    if (!Number.isInteger(thresholdNumber) || thresholdNumber < 1 || thresholdNumber > guardians.length) {
      setError(`Threshold must be between 1 and ${guardians.length}.`);
      return;
    }

    if (!Number.isFinite(heartbeatNumber) || heartbeatNumber < 1) {
      setError("Proof-of-life duration must be at least 1.");
      return;
    }

    if (!Number.isFinite(unlockDelayNumber) || unlockDelayNumber < 0) {
      setError("Final delay cannot be negative.");
      return;
    }

    setSubmitting(true);
    try {
      setStatus("Requesting connected wallet...");
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const from = accounts[0];
      if (!from) throw new Error("No wallet account returned.");

      const payloadBytes = mode === "file" && file ? new Uint8Array() : new TextEncoder().encode(note.trim());

      if (mode === "note" && payloadBytes.length > maxDirectCdrPayloadBytes) {
        setError(
          `This note is ${formatBytes(payloadBytes.length)}, but direct CDR storage only supports very small notes in this demo. Shorten it or use file mode with IPFS storage.`,
        );
        setSubmitting(false);
        return;
      }

      let externalFile:
        | {
            cid: string;
            gatewayUrl: string;
            keyHex: string;
            ivHex: string;
            encryptedSize: number;
          }
        | undefined;

      if (mode === "file" && file) {
        setStatus("Encrypting file in browser...");
        const encrypted = await encryptFileForIpfs(file);
        setStatus("Uploading encrypted file to IPFS...");
        const uploaded = await uploadEncryptedFileToIpfs(file.name, encrypted.encryptedBytes);
        externalFile = {
          cid: uploaded.cid,
          gatewayUrl: uploaded.gatewayUrl,
          keyHex: encrypted.keyHex,
          ivHex: encrypted.ivHex,
          encryptedSize: encrypted.encryptedBytes.length,
        };
      }

      const result = await sealVaultWithCdr({
        account: cleanAddress(from) as Address,
        beneficiary: cleanAddress(beneficiary) as Address,
        guardians: guardians as Address[],
        threshold: thresholdNumber,
        unlockDelaySeconds: durationToSeconds(unlockDelayNumber, unlockDelayUnit),
        heartbeatTimeoutSeconds: durationToSeconds(heartbeatNumber, heartbeatUnit),
        payload: {
          kind: mode === "file" ? "external-file" : "text",
          name: mode === "file" ? file?.name : undefined,
          mimeType: mode === "file" ? file?.type || "application/octet-stream" : "text/plain",
          cid: externalFile?.cid,
          gatewayUrl: externalFile?.gatewayUrl,
          keyHex: externalFile?.keyHex,
          ivHex: externalFile?.ivHex,
          encryptedSize: externalFile?.encryptedSize,
          originalSize: file?.size,
          bytes: payloadBytes,
        },
        onStatus: setStatus,
      });

      saveLastCreatedVault({
        contractAddress: activeClavisAddress,
        vaultId: result.vaultId.toString(),
        uuid: result.uuid,
        txHashes: {
          create: result.createHash,
          allocate: result.allocateTxHash,
          write: result.writeTxHash,
          setRef: result.setRefHash,
        },
        beneficiary: cleanAddress(beneficiary),
        guardians,
        threshold: thresholdNumber,
        heartbeatValue: heartbeatNumber,
        heartbeatUnit,
        unlockDelayValue: unlockDelayNumber,
        unlockDelayUnit,
        createdAt: new Date().toISOString(),
      });

      setTxHash([result.createHash, result.allocateTxHash, result.writeTxHash, result.setRefHash]);
      setInvite({ vaultId: result.vaultId.toString(), uuid: result.uuid });
      setStatus(`Vault ${result.vaultId.toString()} sealed with CDR UUID ${result.uuid}.`);
    } catch (sealError) {
      setError(friendlySealError(sealError));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvite(kind: "beneficiary" | "guardian" | "unlock") {
    if (!invite) return;
    const messages = {
      beneficiary: `You've been named as the beneficiary for a Clavis recovery vault.\n\nVault ID: ${invite.vaultId}\nRequest recovery here: ${appUrl}/beneficiary`,
      guardian: `You've been named as a guardian for a Clavis recovery vault.\n\nVault ID: ${invite.vaultId}\nApprove recovery here after the beneficiary starts recovery: ${appUrl}/guardian`,
      unlock: `Clavis recovery vault access details:\n\nVault ID: ${invite.vaultId}\nCDR UUID: ${invite.uuid}\nUnlock page: ${appUrl}/unlock`,
    };
    await navigator.clipboard.writeText(messages[kind]);
    setCopiedInvite(kind);
    window.setTimeout(() => setCopiedInvite(""), 2500);
  }

  return (
    <div className="form-layout">
      <section className="app-card form-card">
        <div className="form-step">
          <span>01</span>
          <h2>Seal a note or file</h2>
        </div>
        <div className="secret-input">
          <div className="segmented-control" role="tablist" aria-label="Secret type">
            <button className={mode === "note" ? "active" : ""} type="button" onClick={() => setMode("note")}>
              <Type size={16} />
              Text note
            </button>
            <button className={mode === "file" ? "active" : ""} type="button" onClick={() => setMode("file")}>
              <FileUp size={16} />
              File
            </button>
          </div>

          {mode === "note" ? (
            <label>
              Private note or credential
              <textarea
                aria-label="Private note or credential"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          ) : (
            <div className="file-picker">
              <span className="file-label">Private file</span>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.json,.png,.jpg,.jpeg"
                aria-label="Private file"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setError("");
                  setFile(null);

                  if (!nextFile) return;
                  if (nextFile.size > maxFileBytes) {
                    event.target.value = "";
                    setError("Choose a file smaller than 1 MB for the IPFS encrypted file demo.");
                    return;
                  }
                  setFile(nextFile);
                }}
              />
              <button className="file-drop" type="button" onClick={() => inputRef.current?.click()}>
                <FileUp size={22} />
                <span>{file?.name || "Choose a private file"}</span>
                <small>{fileSize || "Up to 1 MB. Encrypted locally, stored on IPFS, key sealed in CDR."}</small>
              </button>
            </div>
          )}
        </div>
        <p className="field-note">
          <LockKeyhole size={15} /> Encrypted and sealed inside CDR before access rules can release it.
        </p>
      </section>

      <section className="app-card form-card">
        <div className="form-step">
          <span>02</span>
          <h2>Map recovery identities</h2>
        </div>
        <label>
          Beneficiary wallet
          <input aria-label="Beneficiary wallet" value={beneficiary} onChange={(event) => setBeneficiary(event.target.value)} />
        </label>
        <label>
          Guardian 1
          <input aria-label="Guardian 1 wallet" value={guardianOne} onChange={(event) => setGuardianOne(event.target.value)} />
        </label>
        <label>
          Guardian 2
          <input aria-label="Guardian 2 wallet" value={guardianTwo} onChange={(event) => setGuardianTwo(event.target.value)} />
        </label>
        <label>
          Guardian 3
          <input aria-label="Guardian 3 wallet" value={guardianThree} onChange={(event) => setGuardianThree(event.target.value)} />
        </label>
      </section>

      <aside className="app-card rule-summary">
        <div className="rule-summary-head">
          <div className="rule-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2>Unlock rule</h2>
            <p>
              Beneficiary can unlock after {threshold || "2"} of 3 guardians approve,
              no owner check-in for {heartbeatLabel}, and {unlockDelayLabel} passes.
            </p>
          </div>
        </div>
        <div className="rule-controls">
          <div className="rule-control-card">
            <div className="rule-control-title">
              <UsersRound size={17} />
              <span>Guardian threshold</span>
            </div>
            <div className="threshold-picker">
              {["1", "2", "3"].map((value) => (
                <button
                  className={threshold === value ? "active" : ""}
                  key={value}
                  type="button"
                  onClick={() => setThreshold(value)}
                >
                  {value} of 3
                </button>
              ))}
            </div>
          </div>
          <div className="rule-control-card">
            <div className="rule-control-title">
              <Clock3 size={17} />
              <span>Proof of life</span>
            </div>
            <div className="duration-row">
              <input
                min="1"
                step="1"
                type="number"
                value={heartbeatValue}
                onChange={(event) => setHeartbeatValue(event.target.value)}
              />
              <select value={heartbeatUnit} onChange={(event) => setHeartbeatUnit(event.target.value as DurationUnit)}>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            <div className="preset-row" aria-label="Proof-of-life presets">
              {[
                ["30 days", "30", "days"],
                ["1 year", "1", "years"],
                ["5 years", "5", "years"],
                ["10 years", "10", "years"],
              ].map(([label, value, unit]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setHeartbeatValue(value);
                    setHeartbeatUnit(unit as DurationUnit);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <small>Recovery can start only after this much owner inactivity.</small>
          </div>
          <div className="rule-control-card">
            <div className="rule-control-title">
              <TimerReset size={17} />
              <span>Final delay</span>
            </div>
            <div className="duration-row">
              <input
                min="0"
                step="1"
                type="number"
                value={unlockDelayValue}
                onChange={(event) => setUnlockDelayValue(event.target.value)}
              />
              <select value={unlockDelayUnit} onChange={(event) => setUnlockDelayUnit(event.target.value as DurationUnit)}>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
              </select>
            </div>
            <div className="preset-row" aria-label="Final delay presets">
              {[
                ["None", "0", "hours"],
                ["24 hours", "24", "hours"],
                ["7 days", "7", "days"],
              ].map(([label, value, unit]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setUnlockDelayValue(value);
                    setUnlockDelayUnit(unit as DurationUnit);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <small>Extra waiting period after recovery begins.</small>
          </div>
        </div>
        <div className="rule-list">
          <span>Threshold: {threshold || "2"} / 3</span>
          <span>Proof of life: {heartbeatLabel}</span>
          <span>Final delay: {unlockDelayLabel}</span>
        </div>
        <button className="primary-action" type="button" disabled={submitting} onClick={sealVault}>
          <UsersRound size={16} />
          {submitting ? "Sealing..." : "Seal Vault"}
        </button>
        {status ? <p className="field-success">{status}</p> : null}
        {txHash.length ? (
          <div className="tx-list">
            {txHash.map((hash) => (
              <code className="tx-hash" key={hash}>
                {hash}
              </code>
            ))}
          </div>
        ) : null}
        {invite ? (
          <div className="invite-panel">
            <span className="card-label">Share recovery access</span>
            <h3>Send these to your trusted people.</h3>
            <p>Share only the vault ID and role link. The secret stays sealed inside CDR.</p>
            <div className="invite-facts">
              <span>Vault ID</span>
              <strong>{invite.vaultId}</strong>
              <span>CDR UUID</span>
              <strong>{invite.uuid}</strong>
            </div>
            <button className="ghost-action" type="button" onClick={() => copyInvite("beneficiary")}>
              {copiedInvite === "beneficiary" ? "Copied beneficiary invite" : "Copy beneficiary invite"}
            </button>
            <button className="ghost-action" type="button" onClick={() => copyInvite("guardian")}>
              {copiedInvite === "guardian" ? "Copied guardian invite" : "Copy guardian approval link"}
            </button>
            <button className="ghost-action" type="button" onClick={() => copyInvite("unlock")}>
              {copiedInvite === "unlock" ? "Copied unlock details" : "Copy unlock details"}
            </button>
          </div>
        ) : null}
        {error ? <p className="field-error">{error}</p> : null}
      </aside>
    </div>
  );
}
