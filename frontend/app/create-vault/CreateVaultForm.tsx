"use client";

import {
  Coins,
  Clock3,
  ExternalLink,
  ShieldCheck,
  TimerReset,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { saveLastCreatedVault } from "../components/vaultStorage";
import {
  activeClavisAddress,
  createVaultOnChain,
  explorerUrl,
} from "./cdrBrowser";

type DurationUnit = "minutes" | "hours" | "days" | "months" | "years";
type InviteDetails = {
  vaultId: string;
  deposit: string;
};

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function cleanAddress(value: string) {
  return value.trim().toLowerCase();
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
  const [initialDeposit, setInitialDeposit] = useState("1.0");
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
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [copiedInvite, setCopiedInvite] = useState("");

  const guardians = [guardianOne, guardianTwo, guardianThree].map(cleanAddress).filter(Boolean);
  const heartbeatLabel = formatDuration(heartbeatValue, heartbeatUnit);
  const unlockDelayLabel =
    Number(unlockDelayValue) === 0 ? "no final delay" : formatDuration(unlockDelayValue, unlockDelayUnit);

  async function handleCreateVault() {
    setError("");
    setStatus("");
    setTxHash("");

    if (!window.ethereum) {
      setError("No injected wallet found. Connect MetaMask, Rabby, or OKX Wallet.");
      return;
    }

    if (!isAddress(beneficiary)) {
      setError("Enter a valid beneficiary wallet address.");
      return;
    }

    if (guardians.length !== 3 || guardians.some((guardian) => !isAddress(guardian))) {
      setError("Enter three valid, unique guardian wallet addresses.");
      return;
    }

    const uniqueGuardians = new Set(guardians);
    if (uniqueGuardians.size !== guardians.length) {
      setError("Guardians must be unique wallet addresses.");
      return;
    }

    if (uniqueGuardians.has(cleanAddress(beneficiary))) {
      setError("A guardian cannot also be the beneficiary.");
      return;
    }

    const thresholdNumber = Number(threshold);
    const heartbeatNumber = Number(heartbeatValue);
    const unlockDelayNumber = Number(unlockDelayValue);
    const depositNumber = Number(initialDeposit);

    if (!Number.isInteger(thresholdNumber) || thresholdNumber < 1 || thresholdNumber > guardians.length) {
      setError(`Threshold must be between 1 and ${guardians.length}.`);
      return;
    }

    if (!Number.isFinite(heartbeatNumber) || heartbeatNumber < 1) {
      setError("Proof-of-life inactivity timeout must be at least 1.");
      return;
    }

    if (!Number.isFinite(unlockDelayNumber) || unlockDelayNumber < 0) {
      setError("Final delay cannot be negative.");
      return;
    }

    if (!Number.isFinite(depositNumber) || depositNumber < 0) {
      setError("Deposit amount must be 0 or greater.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createVaultOnChain({
        beneficiary: cleanAddress(beneficiary) as `0x${string}`,
        guardians: guardians as `0x${string}`[],
        threshold: thresholdNumber,
        unlockDelaySeconds: durationToSeconds(unlockDelayNumber, unlockDelayUnit),
        heartbeatTimeoutSeconds: durationToSeconds(heartbeatNumber, heartbeatUnit),
        initialDepositEther: initialDeposit,
        onStatus: setStatus,
      });

      saveLastCreatedVault({
        contractAddress: activeClavisAddress,
        vaultId: result.vaultId.toString(),
        txHashes: {
          create: result.hash,
        },
        beneficiary: cleanAddress(beneficiary),
        guardians,
        threshold: thresholdNumber,
        balance: initialDeposit,
        status: "Active",
        heartbeatValue: heartbeatNumber,
        heartbeatUnit,
        unlockDelayValue: unlockDelayNumber,
        unlockDelayUnit,
        createdAt: new Date().toISOString(),
      });

      setTxHash(result.hash);
      setInvite({ vaultId: result.vaultId.toString(), deposit: initialDeposit });
      setStatus(`Vault #${result.vaultId.toString()} created and funded on BOT Chain.`);
    } catch (createErr) {
      setError(friendlyError(createErr, "Could not create vault. Please check parameters and try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvite(kind: "beneficiary" | "guardian" | "release") {
    if (!invite) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const messages = {
      beneficiary: `You have been named as the beneficiary for Clavis BOT Inheritance Vault #${invite.vaultId}.\nFunded balance: ${invite.deposit} BOT\nWhen eligible, request recovery here: ${origin}/beneficiary`,
      guardian: `You have been designated as a guardian for Clavis BOT Inheritance Vault #${invite.vaultId}.\nWhen the beneficiary initiates recovery, approve here: ${origin}/guardian`,
      release: `Clavis BOT Inheritance Vault #${invite.vaultId} public release status & audit:\nCheck claim readiness here: ${origin}/unlock`,
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
          <h2>Escrow Deposit (Native BOT)</h2>
        </div>
        <div className="secret-input">
          <label>
            Initial BOT Deposit Amount
            <div className="duration-row">
              <input
                aria-label="Initial BOT Deposit Amount"
                min="0"
                step="0.01"
                type="number"
                value={initialDeposit}
                onChange={(event) => setInitialDeposit(event.target.value)}
              />
              <span className="unit-badge">BOT</span>
            </div>
          </label>
          <div className="preset-row" aria-label="Deposit presets">
            {[
              ["0 BOT", "0"],
              ["0.5 BOT", "0.5"],
              ["1 BOT", "1.0"],
              ["5 BOT", "5.0"],
              ["10 BOT", "10.0"],
            ].map(([label, val]) => (
              <button key={label} type="button" onClick={() => setInitialDeposit(val)}>
                {label}
              </button>
            ))}
          </div>
          <p className="field-note">
            <Coins size={15} /> Native BOT is locked in the smart contract escrow. The owner can withdraw deposited
            funds or deposit additional BOT anytime before terminal release.
          </p>
        </div>
      </section>

      <section className="app-card form-card">
        <div className="form-step">
          <span>02</span>
          <h2>Map Inheritance Identities</h2>
        </div>
        <label>
          Beneficiary wallet address
          <input
            aria-label="Beneficiary wallet"
            placeholder="0x..."
            value={beneficiary}
            onChange={(event) => setBeneficiary(event.target.value)}
          />
        </label>
        <label>
          Guardian 1 wallet address
          <input
            aria-label="Guardian 1 wallet"
            placeholder="0x..."
            value={guardianOne}
            onChange={(event) => setGuardianOne(event.target.value)}
          />
        </label>
        <label>
          Guardian 2 wallet address
          <input
            aria-label="Guardian 2 wallet"
            placeholder="0x..."
            value={guardianTwo}
            onChange={(event) => setGuardianTwo(event.target.value)}
          />
        </label>
        <label>
          Guardian 3 wallet address
          <input
            aria-label="Guardian 3 wallet"
            placeholder="0x..."
            value={guardianThree}
            onChange={(event) => setGuardianThree(event.target.value)}
          />
        </label>
        <p className="field-note">
          <UsersRound size={15} /> Guardians confirm owner inactivity; they never hold or custody the escrowed funds.
        </p>
      </section>

      <aside className="app-card rule-summary">
        <div className="rule-summary-head">
          <div className="rule-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2>Release Conditions</h2>
            <p>
              Beneficiary receives the escrowed BOT after {threshold || "2"} of 3 guardians approve, no owner heartbeat
              for {heartbeatLabel}, and {unlockDelayLabel} passes.
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
              <span>Proof of life (Inactivity timeout)</span>
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
            <small>Recovery can only be initiated after this period of owner inactivity.</small>
          </div>

          <div className="rule-control-card">
            <div className="rule-control-title">
              <TimerReset size={17} />
              <span>Final timelock delay</span>
            </div>
            <div className="duration-row">
              <input
                min="0"
                step="1"
                type="number"
                value={unlockDelayValue}
                onChange={(event) => setUnlockDelayValue(event.target.value)}
              />
              <select
                value={unlockDelayUnit}
                onChange={(event) => setUnlockDelayUnit(event.target.value as DurationUnit)}
              >
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
            <small>Mandatory grace period after recovery is requested before claim is unlocked.</small>
          </div>
        </div>

        <div className="rule-list">
          <span>Deposit: {initialDeposit || "0"} BOT</span>
          <span>Threshold: {threshold || "2"} / 3</span>
          <span>Proof of life: {heartbeatLabel}</span>
          <span>Final delay: {unlockDelayLabel}</span>
        </div>

        <p className="field-note" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          Notice: This is an on-chain programmable beneficiary release based on inactivity and multi-guardian approval.
          It does not verify death, create a legal will, or recover arbitrary external keys.
        </p>

        <button className="primary-action" type="button" disabled={submitting} onClick={handleCreateVault}>
          <ShieldCheck size={16} />
          {submitting ? "Deploying Vault..." : "Create Inheritance Vault"}
        </button>

        {status ? <p className="field-success">{status}</p> : null}
        {txHash ? (
          <div className="tx-list">
            <a
              className="tx-hash"
              href={`${explorerUrl}/tx/${txHash}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              View on BOT Scan <ExternalLink size={14} style={{ display: "inline", verticalAlign: "middle" }} />
            </a>
          </div>
        ) : null}

        {invite ? (
          <div className="invite-panel">
            <span className="card-label">Share Recovery Access</span>
            <h3>Vault #{invite.vaultId} Ready</h3>
            <p>Send the role instructions to your trusted beneficiary and guardians.</p>
            <div className="invite-facts">
              <span>Vault ID</span>
              <strong>#{invite.vaultId}</strong>
              <span>Escrowed Balance</span>
              <strong>{invite.deposit} BOT</strong>
            </div>
            <button className="ghost-action" type="button" onClick={() => copyInvite("beneficiary")}>
              {copiedInvite === "beneficiary" ? "Copied Beneficiary Invite!" : "Copy Beneficiary Instructions"}
            </button>
            <button className="ghost-action" type="button" onClick={() => copyInvite("guardian")}>
              {copiedInvite === "guardian" ? "Copied Guardian Link!" : "Copy Guardian Approval Link"}
            </button>
            <button className="ghost-action" type="button" onClick={() => copyInvite("release")}>
              {copiedInvite === "release" ? "Copied Release Link!" : "Copy Public Release Status Link"}
            </button>
          </div>
        ) : null}

        {error ? <p className="field-error">{error}</p> : null}
      </aside>
    </div>
  );
}
