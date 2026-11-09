"use client";

import { Coins, HeartPulse, ShieldCheck, UsersRound, ExternalLink, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { FriendlyNotice } from "../components/FriendlyNotice";
import { saveLastCreatedVault, type StoredVault } from "../components/vaultStorage";
import {
  activeClavisAddress,
  cancelRecoveryOnChain,
  depositToVaultOnChain,
  explorerUrl,
  loadLatestOwnerVaultFromChain,
  loadRecoveryProgress,
  sendHeartbeatOnChain,
  withdrawFromVaultOnChain,
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
  const [copiedInvite, setCopiedInvite] = useState("");

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showDepositBox, setShowDepositBox] = useState(false);
  const [showWithdrawBox, setShowWithdrawBox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function syncVault() {
      try {
        setStatus("Syncing latest vault from BOT Chain...");
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
    const handleWalletChange = () => void syncVault();
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
    async function syncProgress() {
      if (!vault?.vaultId) {
        setProgress(null);
        return;
      }
      try {
        const nextProgress = await loadRecoveryProgress({ vaultId: BigInt(vault.vaultId) });
        if (!cancelled) {
          setProgress(nextProgress);
          if (nextProgress.balanceEther) {
            setVault((prev) => (prev ? { ...prev, balance: nextProgress.balanceEther } : prev));
          }
        }
      } catch {
        if (!cancelled) setProgress(null);
      }
    }
    void syncProgress();
    const timer = window.setInterval(syncProgress, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [vault?.vaultId, txHash]);

  async function copyInvite(kind: "beneficiary" | "guardian" | "release") {
    if (!vault?.vaultId) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const messages = {
      beneficiary: `You have been named as the beneficiary for Clavis BOT Inheritance Vault #${vault.vaultId}.\nFunded balance: ${vault.balance ?? "0"} BOT\nCheck recovery status & claim when eligible: ${origin}/beneficiary`,
      guardian: `You are a guardian for Clavis BOT Inheritance Vault #${vault.vaultId}.\nApprove recovery when the beneficiary initiates recovery: ${origin}/guardian`,
      release: `Clavis BOT Inheritance Vault #${vault.vaultId} public release status & audit:\nCheck claim readiness: ${origin}/unlock`,
    };
    await navigator.clipboard.writeText(messages[kind]);
    setCopiedInvite(kind);
    window.setTimeout(() => setCopiedInvite(""), 2500);
  }

  async function handleDeposit() {
    if (!vault?.vaultId || !depositAmount || Number(depositAmount) <= 0) {
      setError("Please enter a valid BOT amount to deposit.");
      return;
    }
    setError("");
    setStatus("");
    setTxHash("");
    setSubmitting(true);
    try {
      const hash = await depositToVaultOnChain({
        vaultId: BigInt(vault.vaultId),
        amountEther: depositAmount,
        onStatus: setStatus,
      });
      setTxHash(hash);
      setStatus(`Successfully deposited ${depositAmount} BOT into Vault #${vault.vaultId}.`);
      setDepositAmount("");
      setShowDepositBox(false);
    } catch (depositErr) {
      setError(friendlyError(depositErr, "Deposit failed."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (!vault?.vaultId || !withdrawAmount || Number(withdrawAmount) <= 0) {
      setError("Please enter a valid BOT amount to withdraw.");
      return;
    }
    setError("");
    setStatus("");
    setTxHash("");
    setSubmitting(true);
    try {
      const hash = await withdrawFromVaultOnChain({
        vaultId: BigInt(vault.vaultId),
        amountEther: withdrawAmount,
        onStatus: setStatus,
      });
      setTxHash(hash);
      setStatus(`Successfully withdrew ${withdrawAmount} BOT from Vault #${vault.vaultId}.`);
      setWithdrawAmount("");
      setShowWithdrawBox(false);
    } catch (withdrawErr) {
      setError(friendlyError(withdrawErr, "Withdrawal failed."));
    } finally {
      setSubmitting(false);
    }
  }

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
          <p>Connect your owner wallet to inspect your vaults from BOT Chain.</p>
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
          <span className="card-label">Owner Vault Escrow</span>
          <h2>Create an inheritance vault</h2>
          <p>
            No active vault was found for this owner wallet on BOT Chain. Configure your beneficiary, guardians, and
            escrow funds to get started.
          </p>
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
          {/* Card 1: Proof of Life & Heartbeat */}
          <article className="app-card heartbeat-card">
            <div className="card-top">
              <HeartPulse size={28} />
              <span className="status-pill">Vault #{vault.vaultId}</span>
            </div>
            <span className="card-label">Proof of life</span>
            <h2>Heartbeat Active</h2>
            <p>
              Inactivity timeout:{" "}
              {formatDuration(vault.heartbeatValue ?? vault.heartbeatDays, vault.heartbeatUnit ?? "days")}. Check in
              regularly to reset the countdown.
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
                  setStatus("Proof-of-life heartbeat recorded on BOT Chain. Inactivity timer reset.");
                } catch (heartbeatError) {
                  setError(friendlyError(heartbeatError, "Could not send heartbeat."));
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Confirming..." : "Send Heartbeat"}
            </button>
          </article>

          {/* Card 2: Credited BOT Escrow Balance */}
          <article className="app-card">
            <div className="card-top">
              <Coins size={28} />
              <span className="status-pill">{vault.balance ?? "0"} BOT</span>
            </div>
            <span className="card-label">Custody Escrow</span>
            <h2>{vault.balance ?? "0"} BOT Credited</h2>
            <p>
              Owner maintains full withdrawal control. You can add more BOT or withdraw unreleased funds at any time.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                className="ghost-action"
                type="button"
                onClick={() => {
                  setShowDepositBox(!showDepositBox);
                  setShowWithdrawBox(false);
                }}
              >
                <ArrowDownLeft size={16} /> Deposit
              </button>
              <button
                className="ghost-action"
                type="button"
                onClick={() => {
                  setShowWithdrawBox(!showWithdrawBox);
                  setShowDepositBox(false);
                }}
              >
                <ArrowUpRight size={16} /> Withdraw
              </button>
            </div>

            {showDepositBox ? (
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                <input
                  type="number"
                  placeholder="Amount in BOT"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <button className="primary-action" type="button" disabled={submitting} onClick={handleDeposit}>
                  Confirm Deposit
                </button>
              </div>
            ) : null}

            {showWithdrawBox ? (
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                <input
                  type="number"
                  placeholder="Amount in BOT"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <button className="primary-action" type="button" disabled={submitting} onClick={handleWithdraw}>
                  Confirm Withdrawal
                </button>
              </div>
            ) : null}
          </article>

          {/* Card 3: Multi-Party Rules */}
          <article className="app-card">
            <div className="card-top">
              <UsersRound size={28} />
              <span className="status-pill">{vault.threshold ?? 2} of 3</span>
            </div>
            <span className="card-label">Consensus & Beneficiary</span>
            <h2>Beneficiary: {formatAccount(vault.beneficiary)}</h2>
            <p>
              Requires {vault.threshold ?? 2} guardian approvals plus{" "}
              {formatDuration(vault.unlockDelayValue ?? vault.unlockDelayHours, vault.unlockDelayUnit ?? "hours")} timelock
              delay before release.
            </p>
          </article>
        </div>

        {/* Share Recovery Instructions Panel */}
        <section className="app-card invite-panel dashboard-invite-panel">
          <span className="card-label">Participant Access</span>
          <h2>Share Instructions With Trusted Roles</h2>
          <p>Beneficiary and guardians interact with Vault #{vault.vaultId} using their own role-designated wallets.</p>
          <div className="invite-facts">
            <span>Vault ID</span>
            <strong>#{vault.vaultId}</strong>
            <span>Escrowed Balance</span>
            <strong>{vault.balance ?? "0"} BOT</strong>
          </div>
          <div className="invite-actions">
            <button className="ghost-action" type="button" onClick={() => copyInvite("beneficiary")}>
              {copiedInvite === "beneficiary" ? "Copied Beneficiary Invite!" : "Copy Beneficiary Invite"}
            </button>
            <button className="ghost-action" type="button" onClick={() => copyInvite("guardian")}>
              {copiedInvite === "guardian" ? "Copied Guardian Link!" : "Copy Guardian Link"}
            </button>
            <button className="ghost-action" type="button" onClick={() => copyInvite("release")}>
              {copiedInvite === "release" ? "Copied Release Link!" : "Copy Public Release Audit"}
            </button>
          </div>
        </section>

        {/* Active Recovery Alert (Owner Control) */}
        {progress?.requested ? (
          <section className="app-card recovery-owner-card" style={{ borderColor: "var(--accent)" }}>
            <div>
              <span className="card-label">Owner Intervention</span>
              <h2>Recovery Request Active (Request #{progress.currentRequestId})</h2>
              <p>
                {progress.approvalCount} of {progress.threshold} guardian approvals recorded. If you are active, cancel
                the recovery immediately to restore activity and invalidate all pending approvals.
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
                  setStatus("Recovery request cancelled. Guardian approvals invalidated and vault secured.");
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
            title={submitting || cancelSubmitting ? "Working on it" : "Action Completed"}
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
      </>
    );
  }

  return <>{content}</>;
}
