"use client";

import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { FriendlyNotice } from "../components/FriendlyNotice";
import {
  checkRecoveryRole,
  loadLatestRecoveryVaultForConnectedWallet,
  loadRecoveryReadiness,
  requestRecoveryOnChain,
} from "../create-vault/cdrBrowser";

type Readiness = Awaited<ReturnType<typeof loadRecoveryReadiness>>;

function formatCountdown(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export function RecoveryRequest() {
  const [vaultId, setVaultId] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [roleStatus, setRoleStatus] = useState("Enter a vault ID to check beneficiary access.");
  const [requested, setRequested] = useState(false);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadBeneficiaryVault() {
      setAutoLoading(true);
      try {
        const vault = await loadLatestRecoveryVaultForConnectedWallet("beneficiary");
        if (cancelled) return;
        if (vault?.vaultId) {
          setVaultId(vault.vaultId);
          setRoleStatus(`Loaded Vault #${vault.vaultId} for the connected beneficiary wallet.`);
        } else {
          setRoleStatus("No beneficiary vault found for the connected wallet.");
        }
      } catch {
        if (!cancelled) setRoleStatus("Connect the beneficiary wallet to auto-load its vault.");
      } finally {
        if (!cancelled) setAutoLoading(false);
      }
    }

    void loadBeneficiaryVault();
    const handleWalletChange = () => void loadBeneficiaryVault();
    window.addEventListener("clavis-wallet-change", handleWalletChange);
    window.ethereum?.on?.("accountsChanged", handleWalletChange);
    return () => {
      cancelled = true;
      window.removeEventListener("clavis-wallet-change", handleWalletChange);
      window.ethereum?.removeListener?.("accountsChanged", handleWalletChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkRole() {
      setAllowed(false);
      if (!vaultId.trim()) {
        setRoleStatus("Enter a vault ID to check beneficiary access.");
        return;
      }
      try {
        setRoleStatus("Checking beneficiary wallet...");
        const result = await checkRecoveryRole({ vaultId: BigInt(vaultId), role: "beneficiary" });
        if (cancelled) return;
        setAllowed(result.allowed);
        setRequested(result.reason.includes("already been requested"));
        setRoleStatus(result.allowed ? "Beneficiary wallet connected." : result.reason);
      } catch {
        if (!cancelled) setRoleStatus("Could not verify beneficiary access for this vault.");
      }
    }
    void checkRole();
    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  useEffect(() => {
    let cancelled = false;
    async function checkReadiness() {
      setReadiness(null);
      if (!vaultId.trim()) return;
      try {
        const nextReadiness = await loadRecoveryReadiness({ vaultId: BigInt(vaultId) });
        if (!cancelled) {
          setReadiness(nextReadiness);
          setRequested(nextReadiness.recoveryRequested);
        }
      } catch {
        if (!cancelled) setReadiness(null);
      }
    }
    void checkReadiness();
    const timer = window.setInterval(checkReadiness, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [vaultId, status]);

  const recoveryReady = readiness?.expired || readiness?.recoveryRequested;

  return (
    <div className="action-stack">
      <label>
        Vault ID
        <input
          value={vaultId}
          placeholder={autoLoading ? "Looking for your vault..." : "Connect beneficiary wallet or enter vault ID"}
          onChange={(event) => setVaultId(event.target.value)}
        />
      </label>
      {readiness ? (
        <div className={`readiness-card ${readiness.expired ? "ready" : ""}`}>
          <span className="card-label">Recovery readiness</span>
          <h3>
            {readiness.recoveryRequested
              ? "Recovery already requested"
              : readiness.expired
                ? "Proof-of-life expired"
                : "Owner still active"}
          </h3>
          <p>
            {readiness.recoveryRequested
              ? `${readiness.approvalCount} of ${readiness.threshold} guardian approvals collected.`
              : readiness.expired
                ? "The beneficiary can request recovery now."
                : `Recovery opens in ${formatCountdown(readiness.secondsRemaining)} if no heartbeat is sent.`}
          </p>
        </div>
      ) : null}
      <button
        className="primary-action"
        type="button"
        disabled={submitting || !allowed || requested || !recoveryReady}
        onClick={async () => {
          setError("");
          setStatus("");
          setTxHash("");
          if (!vaultId.trim()) {
            setError("Enter a vault ID.");
            return;
          }
          setSubmitting(true);
          try {
            const hash = await requestRecoveryOnChain({
              vaultId: BigInt(vaultId),
              onStatus: setStatus,
            });
            setTxHash(hash);
            setRequested(true);
            setAllowed(false);
            setStatus("Recovery requested. Guardians can now approve.");
          } catch (requestError) {
            setError(friendlyError(requestError, "Could not request recovery."));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <KeyRound size={16} />
        {submitting ? "Requesting..." : "Request Recovery"}
      </button>
      <p className={allowed && recoveryReady ? "field-success" : "field-note"}>
        {!recoveryReady && allowed ? "Recovery is not open yet. Wait for proof-of-life to expire." : roleStatus}
      </p>
      {status || txHash ? (
        <FriendlyNotice kind={submitting ? "loading" : "success"} title={submitting ? "Working on it" : "Recovery requested"} message={status} txHash={txHash} />
      ) : null}
      {error ? <FriendlyNotice kind="error" title="Recovery request failed" message={error} /> : null}
    </div>
  );
}
