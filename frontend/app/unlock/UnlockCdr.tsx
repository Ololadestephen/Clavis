"use client";

import { CheckCircle2, Download, LockOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { FriendlyNotice } from "../components/FriendlyNotice";
import { loadRecoveryProgress, unlockCdrVault, type DecodedCdrPayload } from "../create-vault/cdrBrowser";

type Progress = Awaited<ReturnType<typeof loadRecoveryProgress>>;

export function UnlockCdr() {
  const [vaultId, setVaultId] = useState("");
  const [uuid, setUuid] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [payload, setPayload] = useState<DecodedCdrPayload | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refreshProgress() {
      if (!vaultId.trim()) {
        setProgress(null);
        return;
      }
      try {
        const nextProgress = await loadRecoveryProgress({ vaultId: BigInt(vaultId) });
        if (!cancelled) setProgress(nextProgress);
      } catch {
        if (!cancelled) setProgress(null);
      }
    }
    void refreshProgress();
    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  const textSecret = useMemo(() => {
    if (!payload || payload.metadata.kind !== "text") return "";
    return new TextDecoder().decode(payload.bytes);
  }, [payload]);

  function hexToBytes(hex: string) {
    const cleanHex = hex.replace(/^0x/, "");
    return new Uint8Array(cleanHex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
  }

  async function downloadFile() {
    if (!payload) return;

    let bytes = payload.bytes;
    if (payload.metadata.kind === "external-file") {
      if (!payload.metadata.gatewayUrl || !payload.metadata.keyHex || !payload.metadata.ivHex) {
        setError("Recovered CDR metadata is missing the IPFS file key or CID.");
        return;
      }

      setStatus("Downloading encrypted file from IPFS...");
      const response = await fetch(payload.metadata.gatewayUrl);
      if (!response.ok) {
        setError("Could not download the encrypted file from IPFS.");
        return;
      }
      const encryptedBytes = await response.arrayBuffer();
      setStatus("Decrypting file in browser...");
      const key = await crypto.subtle.importKey("raw", hexToBytes(payload.metadata.keyHex), "AES-GCM", false, ["decrypt"]);
      bytes = new Uint8Array(
        await crypto.subtle.decrypt({ name: "AES-GCM", iv: hexToBytes(payload.metadata.ivHex) }, key, encryptedBytes),
      );
    }

    const blob = new Blob([bytes], {
      type: payload.metadata.mimeType ?? "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = payload.metadata.name ?? "clavis-recovered-file";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="action-stack">
      <label>
        Vault ID
        <input value={vaultId} onChange={(event) => setVaultId(event.target.value)} />
      </label>
      <label>
        CDR UUID
        <input value={uuid} onChange={(event) => setUuid(event.target.value)} />
      </label>
      {progress ? (
        <div className="approval-panel">
          <div>
            <span className="card-label">Guardian approvals</span>
            <h3>
              {progress.approvalCount} / {progress.threshold} required
            </h3>
            <p>{progress.requested ? "Recovery request is active." : "Waiting for beneficiary recovery request."}</p>
          </div>
          <div className="approval-dots">
            {progress.approvals.map((item, index) => (
              <span className={item.approved ? "approved" : ""} key={item.guardian} title={item.guardian}>
                {item.approved ? <CheckCircle2 size={15} /> : index + 1}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <button
        className="primary-action"
        type="button"
        disabled={submitting}
        onClick={async () => {
          setError("");
          setStatus("");
          setTxHash("");
          setPayload(null);
          if (!vaultId.trim() || !uuid.trim()) {
            setError("Enter both vault ID and CDR UUID.");
            return;
          }
          setSubmitting(true);
          try {
            const result = await unlockCdrVault({
              vaultId: BigInt(vaultId),
              uuid: Number(uuid),
              onStatus: setStatus,
            });
            setTxHash(result.txHash);
            setPayload(result.payload);
            setStatus("Vault unlocked. Your private payload is ready.");
          } catch (unlockError) {
            setError(friendlyError(unlockError, "Could not unlock CDR vault."));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <LockOpen size={16} />
        {submitting ? "Checking..." : "Check Access"}
      </button>
      {payload?.metadata.kind === "file" || payload?.metadata.kind === "external-file" ? (
        <button className="ghost-action" type="button" onClick={downloadFile}>
          <Download size={16} />
          Download {payload.metadata.name ?? "File"}
        </button>
      ) : null}
      {textSecret ? <pre>{textSecret}</pre> : null}
      {status || txHash ? (
        <FriendlyNotice kind={submitting ? "loading" : "success"} title={submitting ? "Checking access" : "Access update"} message={status} txHash={txHash} />
      ) : null}
      {error ? <FriendlyNotice kind="error" title="Unlock failed" message={error} /> : null}
    </div>
  );
}
