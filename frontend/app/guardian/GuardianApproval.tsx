"use client";

import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { FriendlyNotice } from "../components/FriendlyNotice";
import {
  approveRecoveryOnChain,
  checkRecoveryRole,
  explorerUrl,
  loadLatestRecoveryVaultForConnectedWallet,
  loadRecoveryProgress,
} from "../create-vault/cdrBrowser";

type Progress = Awaited<ReturnType<typeof loadRecoveryProgress>>;

export function GuardianApproval() {
  const [vaultId, setVaultId] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [roleStatus, setRoleStatus] = useState("Enter a vault ID to check guardian access.");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [hasAlreadyApproved, setHasAlreadyApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadGuardianVault() {
      setAutoLoading(true);
      try {
        const vault = await loadLatestRecoveryVaultForConnectedWallet("guardian");
        if (cancelled) return;
        if (vault?.vaultId) {
          setVaultId(vault.vaultId);
          setRoleStatus(`Loaded Vault #${vault.vaultId} for the connected guardian wallet.`);
        } else {
          setRoleStatus("No guardian vault found for the connected wallet on BOT Chain.");
        }
      } catch {
        if (!cancelled) setRoleStatus("Connect a guardian wallet to auto-load its vault.");
      } finally {
        if (!cancelled) setAutoLoading(false);
      }
    }

    void loadGuardianVault();
    const handleWalletChange = () => void loadGuardianVault();
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
        setRoleStatus("Enter a vault ID to check guardian access.");
        return;
      }
      try {
        setRoleStatus("Checking guardian wallet on BOT Chain...");
        const result = await checkRecoveryRole({ vaultId: BigInt(vaultId), role: "guardian" });
        if (cancelled) return;
        setAllowed(result.allowed);
        setRoleStatus(result.allowed ? "Guardian wallet verified." : result.reason);
      } catch {
        if (!cancelled) setRoleStatus("Could not verify guardian access for this vault.");
      }
    }
    void checkRole();
    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      if (!vaultId.trim()) {
        setProgress(null);
        return;
      }
      try {
        const p = await loadRecoveryProgress({ vaultId: BigInt(vaultId) });
        if (cancelled) return;
        setProgress(p);

        // Check if the current connected wallet is among the approved guardians
        if (typeof window !== "undefined" && window.ethereum) {
          const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
          const currentAccount = accounts[0]?.toLowerCase();
          const match = p.approvals.find((a) => a.guardian.toLowerCase() === currentAccount);
          setHasAlreadyApproved(Boolean(match?.approved));
        }
      } catch {
        if (!cancelled) setProgress(null);
      }
    }
    void fetchProgress();
    const timer = window.setInterval(fetchProgress, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [vaultId, txHash]);

  return (
    <div className="action-stack">
      <label>
        Vault ID
        <input
          value={vaultId}
          placeholder={autoLoading ? "Looking for your vault..." : "Connect guardian wallet or enter vault ID"}
          onChange={(event) => setVaultId(event.target.value)}
        />
      </label>

      {progress ? (
        <div className="approval-panel" style={{ marginTop: "0.5rem" }}>
          <div>
            <span className="card-label">Guardian Consensus (Request #{progress.currentRequestId})</span>
            <h3>
              {progress.approvalCount} / {progress.threshold} Required Approvals
            </h3>
            <p>
              {progress.status === "Released"
                ? "This vault has already been released (terminal state)."
                : progress.requested
                  ? "Recovery request is active and awaiting guardian signatures."
                  : "No active recovery request. Beneficiary must initiate recovery first."}
            </p>
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
        disabled={submitting || !allowed || !progress?.requested || hasAlreadyApproved || progress?.status === "Released"}
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
            const reqIdBigInt = progress?.currentRequestId ? BigInt(progress.currentRequestId) : undefined;
            const hash = await approveRecoveryOnChain({
              vaultId: BigInt(vaultId),
              requestId: reqIdBigInt,
              onStatus: setStatus,
            });
            setTxHash(hash);
            setHasAlreadyApproved(true);
            setStatus("Guardian approval submitted and confirmed on BOT Chain.");
          } catch (approvalError) {
            setError(friendlyError(approvalError, "Could not approve recovery."));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <ShieldCheck size={16} />
        {submitting
          ? "Approving..."
          : hasAlreadyApproved
            ? "Already Approved This Request"
            : !progress?.requested
              ? "Waiting for Recovery Request"
              : "Approve Recovery"}
      </button>

      <p className={allowed && progress?.requested ? "field-success" : "field-note"}>
        {hasAlreadyApproved ? "Your approval has been recorded for this request." : roleStatus}
      </p>

      {status || txHash ? (
        <FriendlyNotice
          kind={submitting ? "loading" : "success"}
          title={submitting ? "Submitting approval" : "Approval Confirmed"}
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

      {error ? <FriendlyNotice kind="error" title="Approval Failed" message={error} /> : null}
    </div>
  );
}
