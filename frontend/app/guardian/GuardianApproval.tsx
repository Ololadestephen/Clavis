"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { friendlyError } from "../components/friendlyErrors";
import { FriendlyNotice } from "../components/FriendlyNotice";
import { approveRecoveryOnChain, checkRecoveryRole } from "../create-vault/cdrBrowser";

function friendlyApprovalError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("RecoveryNotRequested")) {
    return "Recovery has not been requested yet. The beneficiary must request recovery before guardians can approve.";
  }
  if (message.includes("AlreadyApproved")) {
    return "This guardian has already approved this recovery request.";
  }
  if (message.includes("NotGuardian")) {
    return "This wallet is not listed as a guardian for this vault.";
  }
  if (message.includes("User rejected") || message.includes("rejected")) {
    return "Wallet confirmation was cancelled.";
  }
  return friendlyError(error, "Could not approve recovery.");
}

export function GuardianApproval() {
  const [vaultId, setVaultId] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [roleStatus, setRoleStatus] = useState("Enter a vault ID to check guardian access.");

  useEffect(() => {
    let cancelled = false;
    async function checkRole() {
      setAllowed(false);
      if (!vaultId.trim()) {
        setRoleStatus("Enter a vault ID to check guardian access.");
        return;
      }
      try {
        setRoleStatus("Checking guardian wallet...");
        const result = await checkRecoveryRole({ vaultId: BigInt(vaultId), role: "guardian" });
        if (cancelled) return;
        setAllowed(result.allowed);
        setRoleStatus(result.allowed ? "Guardian wallet connected." : result.reason);
      } catch {
        if (!cancelled) setRoleStatus("Could not verify guardian access for this vault.");
      }
    }
    void checkRole();
    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  return (
    <div className="action-stack">
      <label>
        Vault ID
        <input value={vaultId} onChange={(event) => setVaultId(event.target.value)} />
      </label>
      <button
        className="primary-action"
        type="button"
        disabled={submitting || !allowed}
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
            const hash = await approveRecoveryOnChain({
              vaultId: BigInt(vaultId),
              onStatus: setStatus,
            });
            setTxHash(hash);
            setStatus("Guardian approval submitted.");
          } catch (approvalError) {
            setError(friendlyApprovalError(approvalError));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <ShieldCheck size={16} />
        {submitting ? "Approving..." : "Approve Recovery"}
      </button>
      <p className={allowed ? "field-success" : "field-note"}>{roleStatus}</p>
      {status || txHash ? (
        <FriendlyNotice kind={submitting ? "loading" : "success"} title={submitting ? "Working on it" : "Approval submitted"} message={status} txHash={txHash} />
      ) : null}
      {error ? <FriendlyNotice kind="error" title="Approval failed" message={error} /> : null}
    </div>
  );
}
