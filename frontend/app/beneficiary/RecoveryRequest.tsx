"use client";

import { Coins, ExternalLink, KeyRound, LockOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { FriendlyNotice } from "../components/FriendlyNotice";
import {
  checkRecoveryRole,
  claimInheritanceOnChain,
  explorerUrl,
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
  const [claiming, setClaiming] = useState(false);
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
          setRoleStatus("No beneficiary vault found for the connected wallet on BOT Chain.");
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
        setRequested(result.reason.includes("already active"));
        setRoleStatus(result.allowed ? "Beneficiary wallet verified." : result.reason);
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
    const timer = window.setInterval(checkReadiness, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [vaultId, status]);

  const recoveryReadyToRequest = readiness?.expired && !readiness?.recoveryRequested && !readiness?.released;
  const canExecuteClaim =
    readiness?.recoveryRequested &&
    readiness.approvalCount >= readiness.threshold &&
    readiness.delayElapsed &&
    readiness.expired &&
    !readiness.released &&
    Number(readiness.balanceEther) > 0;

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
          <span className="card-label">Inheritance Escrow Status</span>
          <h3>
            {readiness.released
              ? "Vault Already Released (Terminal)"
              : readiness.recoveryRequested
                ? `Recovery Active (Request #${readiness.currentRequestId})`
                : readiness.expired
                  ? "Proof-of-Life Expired — Ready to Request"
                  : "Owner Still Active"}
          </h3>
          <p>
            {readiness.released
              ? "All credited funds have already been claimed and paid out."
              : readiness.recoveryRequested
                ? `${readiness.approvalCount} of ${readiness.threshold} guardian approvals recorded. ${
                    readiness.delayElapsed
                      ? "Timelock delay elapsed."
                      : `Timelock delay ends in ${formatCountdown(readiness.delaySecondsRemaining)}.`
                  }`
                : readiness.expired
                  ? "Owner has been inactive longer than the configured timeout. Beneficiary can request recovery."
                  : `Recovery opens in ${formatCountdown(readiness.secondsRemaining)} if owner sends no heartbeat.`}
          </p>
          <div style={{ marginTop: "0.5rem", fontWeight: "bold" }}>
            Credited Escrow Balance: {readiness.balanceEther} BOT
          </div>
        </div>
      ) : null}

      {/* Button to Request Recovery */}
      {!requested && !readiness?.released ? (
        <button
          className="primary-action"
          type="button"
          disabled={submitting || !allowed || !recoveryReadyToRequest}
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
              setStatus("Recovery requested on BOT Chain. Guardians can now review and approve.");
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
      ) : null}

      {/* Button to Claim Inheritance (when all conditions pass) */}
      {requested && !readiness?.released ? (
        <button
          className="primary-action"
          type="button"
          style={{ backgroundColor: canExecuteClaim ? "var(--accent)" : undefined }}
          disabled={claiming || !allowed || !canExecuteClaim}
          onClick={async () => {
            setError("");
            setStatus("");
            setTxHash("");
            setClaiming(true);
            try {
              const hash = await claimInheritanceOnChain({
                vaultId: BigInt(vaultId),
                onStatus: setStatus,
              });
              setTxHash(hash);
              setStatus(`Inheritance claimed! ${readiness?.balanceEther ?? ""} BOT transferred to your wallet.`);
            } catch (claimErr) {
              setError(friendlyError(claimErr, "Inheritance claim failed."));
            } finally {
              setClaiming(false);
            }
          }}
        >
          <Coins size={16} />
          {claiming ? "Claiming..." : `Claim Inheritance (${readiness?.balanceEther ?? "0"} BOT)`}
        </button>
      ) : null}

      <p className={allowed && (recoveryReadyToRequest || canExecuteClaim) ? "field-success" : "field-note"}>
        {!recoveryReadyToRequest && !requested && allowed
          ? "Recovery is not open yet. Wait for owner inactivity timeout to expire."
          : requested && !canExecuteClaim && allowed
            ? "Recovery active. Waiting for guardian threshold and final delay before claim unlocks."
            : roleStatus}
      </p>

      {status || txHash ? (
        <FriendlyNotice
          kind={submitting || claiming ? "loading" : "success"}
          title={submitting ? "Submitting request" : claiming ? "Executing claim" : "Transaction Confirmed"}
          message={status}
          txHash={txHash}
        />
      ) : null}

      {txHash ? (
        <p style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <a
            href={`${explorerUrl}/tx/${txHash}`}
            rel="noopener noreferrer"
            target="_blank"
            style={{ color: "var(--accent)", textDecoration: "underline" }}
          >
            View transaction on BOT Scan <ExternalLink size={14} style={{ display: "inline" }} />
          </a>
        </p>
      ) : null}

      {error ? <FriendlyNotice kind="error" title="Action Failed" message={error} /> : null}
    </div>
  );
}
