"use client";

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected the request")) {
    return "You cancelled this in your wallet. Nothing was changed.";
  }
  if (lower.includes("insufficient funds")) {
    return "This wallet does not have enough IP to pay the network fee.";
  }
  if (message.includes("NotOwner")) {
    return "Only the vault owner can do this.";
  }
  if (message.includes("NotBeneficiary")) {
    return "Only the named beneficiary can request recovery for this vault.";
  }
  if (message.includes("NotGuardian")) {
    return "Only a listed guardian can approve this recovery.";
  }
  if (message.includes("RecoveryNotRequested")) {
    return "Recovery has not been requested yet.";
  }
  if (message.includes("RecoveryAlreadyRequested")) {
    return "Recovery has already been requested. Guardians can approve now.";
  }
  if (message.includes("AlreadyApproved")) {
    return "This guardian has already approved this recovery request.";
  }
  if (message.includes("InvalidVault")) {
    return "We could not find that vault. Check the vault ID.";
  }
  if (message.includes("exceeds max 1024 bytes") || message.includes("ContentSizeExceeded")) {
    return "This payload is too large for direct CDR storage. Use encrypted IPFS file mode for larger files.";
  }
  if (lower.includes("execution reverted")) {
    return "The contract rejected this action. Check that you are using the right wallet and the recovery step is ready.";
  }

  return fallback;
}
