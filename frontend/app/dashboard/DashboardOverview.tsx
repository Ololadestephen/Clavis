"use client";

import { HeartPulse, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { FriendlyNotice } from "../components/FriendlyNotice";
import { saveLastCreatedVault, type StoredVault } from "../components/vaultStorage";
import {
  activeClavisAddress,
  cancelRecoveryOnChain,
  loadLatestOwnerVaultFromChain,
  loadRecoveryProgress,
  sendHeartbeatOnChain,
} from "../create-vault/cdrBrowser";

type Progress = Awaited<ReturnType<typeof loadRecoveryProgress>>;

function formatAccount(value?: string) {
  if (!value) return "Not set";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDuration(value?: number, unit?: string) {
  if (!value || !unit) return "Not set";
  const label = value === 1 ? unit.replace(/s$/, "") : unit;
  return `${value} ${label}`;
}

export function DashboardOverview() {
  const [vault, setVault] = useState<StoredVault | null>(null);
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [walletChecked, setWalletChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function syncVault() {
      try {
        setStatus("Syncing latest vault from chain...");
        const chainVault = await loadLatestOwnerVaultFromChain();
        if (cancelled) return;
        if (chainVault) {
          const scopedVault = { ...chainVault, contractAddress: activeClavisAddress };
          saveLastCreatedVault(scopedVault);
          setVault(scopedVault);
          setStatus("");
        } else {
          setVault(null);
          setStatus("");
        }
      } catch {
        if (!cancelled) {
          setVault(null);
          setStatus("");
        }
      } finally {
        if (!cancelled) setWalletChecked(true);
      }
    }

    void syncVault();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function syncProgress() {
      if (!vault?.vaultId) {
        setProgress(null);
        return;
      }
      try {
        const nextProgress = await loadRecoveryProgress({ vaultId: BigInt(vault.vaultId) });
        if (!cancelled) setProgress(nextProgress);
      } catch {
        if (!cancelled) setProgress(null);
      }
    }
    void syncProgress();
    return () => {
      cancelled = true;
    };
  }, [vault?.vaultId, txHash]);

  let content;

  if (!walletChecked) {
    content = (
      <div className="dashboard-grid dashboard-grid-empty">
        <article className="app-card heartbeat-card">
          <div className="card-top">
            <HeartPulse size={28} />
            <span className="status-pill muted">Syncing</span>
          </div>
          <span className="card-label">Overview</span>
          <h2>Checking connected wallet</h2>
          <p>Connect your owner wallet to load vaults from chain.</p>
        </article>
      </div>
    );
  } else if (!vault?.vaultId) {
    content = (
        <div className="dashboard-grid dashboard-grid-empty">
          <article className="app-card heartbeat-card">
            <div className="card-top">
              <HeartPulse size={28} />
              <span className="status-pill muted">Setup required</span>
            </div>
            <span className="card-label">Proof of life</span>
            <h2>Create a vault first</h2>
            <p>Heartbeat starts after a vault exists, because the contract checks in against a specific vault ID.</p>
            <a className="primary-action" href="/create-vault">
              Create Vault
            </a>
          </article>
        </div>
    );
  } else {
    content = (
    <>
      <div className="dashboard-grid">
        <article className="app-card heartbeat-card">
          <div className="card-top">
            <HeartPulse size={28} />
            <span className="status-pill">Vault #{vault.vaultId}</span>
          </div>
          <span className="card-label">Proof of life</span>
          <h2>Heartbeat active</h2>
          <p>
            Recovery becomes possible after no owner check-in for{" "}
            {formatDuration(vault.heartbeatValue ?? vault.heartbeatDays, vault.heartbeatUnit ?? "days")}.
          </p>
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
                const hash = await sendHeartbeatOnChain({
                  vaultId: BigInt(vault.vaultId ?? "0"),
                  onStatus: setStatus,
                });
                setTxHash(hash);
                setStatus("Proof-of-life heartbeat sent.");
              } catch (heartbeatError) {
                setError(friendlyError(heartbeatError, "Could not send heartbeat."));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Sending..." : "Send Heartbeat"}
          </button>
          {status ? <p className="field-success">{status}</p> : null}
          {txHash ? <code className="tx-hash">{txHash}</code> : null}
          {error ? <p className="field-error">{error}</p> : null}
        </article>
        <article className="app-card">
          <UsersRound size={28} />
          <h2>{vault.guardians?.length ?? 0} guardians</h2>
          <p>
            Threshold is {vault.threshold ?? 2} of {vault.guardians?.length ?? 3}. Beneficiary is{" "}
            {formatAccount(vault.beneficiary)}.
          </p>
        </article>
        <article className="app-card">
          <ShieldCheck size={28} />
          <h2>CDR sealed</h2>
          <p>
            CDR UUID {vault.uuid ?? "pending"} is linked to Vault #{vault.vaultId}. Final delay is{" "}
            {formatDuration(vault.unlockDelayValue ?? vault.unlockDelayHours, vault.unlockDelayUnit ?? "hours")}.
          </p>
        </article>
      </div>
      {progress?.requested ? (
        <section className="app-card recovery-owner-card">
          <div>
            <span className="card-label">Owner control</span>
            <h2>Recovery request active</h2>
            <p>
              {progress.approvalCount} of {progress.threshold} guardian approvals collected. If you are back, cancel the
              recovery before access is released.
            </p>
          </div>
          <button
            className="ghost-action danger-action"
            type="button"
            disabled={cancelSubmitting}
            onClick={async () => {
              setError("");
              setStatus("");
              setTxHash("");
              setCancelSubmitting(true);
              try {
                const hash = await cancelRecoveryOnChain({
                  vaultId: BigInt(vault.vaultId ?? "0"),
                  onStatus: setStatus,
                });
                setTxHash(hash);
                setStatus("Recovery cancelled. Beneficiary access is blocked again.");
                setProgress(null);
              } catch (cancelError) {
                setError(friendlyError(cancelError, "Could not cancel recovery."));
              } finally {
                setCancelSubmitting(false);
              }
            }}
          >
            {cancelSubmitting ? "Cancelling..." : "Cancel Recovery"}
          </button>
        </section>
      ) : null}
      {status || txHash ? (
        <FriendlyNotice
          kind={submitting || cancelSubmitting ? "loading" : "success"}
          title={submitting || cancelSubmitting ? "Working on it" : "Vault updated"}
          message={status}
          txHash={txHash}
        />
      ) : null}
      {error ? <FriendlyNotice kind="error" title="Vault action failed" message={error} /> : null}
    </>
  );
  }

  return <>{content}</>;
}
