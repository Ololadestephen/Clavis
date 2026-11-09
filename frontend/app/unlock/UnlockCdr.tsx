"use client";

import { CheckCircle2, Coins, ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { FriendlyNotice } from "../components/FriendlyNotice";
import {
  claimInheritanceOnChain,
  explorerUrl,
  loadRecoveryProgress,
  loadRecoveryReadiness,
} from "../create-vault/cdrBrowser";

type Progress = Awaited<ReturnType<typeof loadRecoveryProgress>>;
type Readiness = Awaited<ReturnType<typeof loadRecoveryReadiness>>;

export function UnlockCdr() {
  const [vaultId, setVaultId] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!vaultId.trim()) {
        setProgress(null);
        setReadiness(null);
        return;
      }
      try {
        const [nextProgress, nextReadiness] = await Promise.all([
          loadRecoveryProgress({ vaultId: BigInt(vaultId) }),
          loadRecoveryReadiness({ vaultId: BigInt(vaultId) }),
        ]);
        if (!cancelled) {
          setProgress(nextProgress);
          setReadiness(nextReadiness);
        }
      } catch {
        if (!cancelled) {
          setProgress(null);
          setReadiness(null);
        }
      }
    }
    void refresh();
    return () => {
      cancelled = true;
    };
  }, [vaultId, txHash]);

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
          placeholder="Enter vault ID (e.g. 1)"
          onChange={(event) => setVaultId(event.target.value)}
        />
      </label>

      {readiness && progress ? (
        <div className="approval-panel" style={{ marginTop: "0.5rem" }}>
          <div>
            <span className="card-label">Vault #{vaultId} Status</span>
            <h3>
              {readiness.released
                ? "Vault Released (Terminal State)"
                : readiness.recoveryRequested
                  ? `Recovery Active (Request #${readiness.currentRequestId})`
                  : readiness.expired
                    ? "Inactivity Elapsed (Ready to Request)"
                    : "Owner Active (Check-in Valid)"}
            </h3>
            <p>
              Escrow Balance: <strong>{readiness.balanceEther} BOT</strong> &middot; Guardian Approvals:{" "}
              <strong>
                {progress.approvalCount} / {progress.threshold}
              </strong>
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

      {readiness && !readiness.released ? (
        <div className={`readiness-card ${canExecuteClaim ? "ready" : ""}`}>
          <span className="card-label">Release Eligibility</span>
          <h3>{canExecuteClaim ? "Eligible for Beneficiary Claim" : "Conditions Incomplete"}</h3>
          <p>
            {!readiness.expired
              ? "1. Inactivity period has not elapsed yet."
              : !readiness.recoveryRequested
                ? "2. Beneficiary has not requested recovery yet."
                : readiness.approvalCount < readiness.threshold
                  ? `3. Guardian threshold not reached (${readiness.approvalCount}/${readiness.threshold}).`
                  : !readiness.delayElapsed
                    ? `4. Timelock delay active (${readiness.delaySecondsRemaining}s remaining).`
                    : "All consensus, inactivity, and timelock requirements satisfied!"}
          </p>
        </div>
      ) : null}

      {canExecuteClaim ? (
        <button
          className="primary-action"
          type="button"
          disabled={submitting}
          onClick={async () => {
            setError("");
            setStatus("");
            setTxHash("");
            setSubmitting(true);
            try {
              const hash = await claimInheritanceOnChain({
                vaultId: BigInt(vaultId),
                onStatus: setStatus,
              });
              setTxHash(hash);
              setStatus(`Inheritance payout complete! ${readiness?.balanceEther} BOT transferred to beneficiary.`);
            } catch (claimErr) {
              setError(friendlyError(claimErr, "Claim failed."));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <Coins size={16} />
          {submitting ? "Processing..." : `Claim ${readiness?.balanceEther} BOT`}
        </button>
      ) : null}

      {status || txHash ? (
        <FriendlyNotice
          kind={submitting ? "loading" : "success"}
          title={submitting ? "Executing Claim" : "Release Confirmed"}
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

      {error ? <FriendlyNotice kind="error" title="Release Check Failed" message={error} /> : null}
    </div>
  );
}
