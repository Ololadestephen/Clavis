"use client";

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected the request")) {
    return "You cancelled this transaction in your wallet. Nothing was changed.";
  }
  if (lower.includes("insufficient funds")) {
    return "This wallet does not have enough BOT to pay the transaction or network gas fee.";
  }
  if (message.includes("OwnerIsBeneficiary")) {
    return "The owner and beneficiary must be different wallet addresses.";
  }
  if (message.includes("GuardianIsOwner")) {
    return "A guardian cannot be the vault owner.";
  }
  if (message.includes("GuardianIsBeneficiary")) {
    return "A guardian cannot be the beneficiary.";
  }
  if (message.includes("DuplicateGuardian")) {
    return "Guardians must be unique wallet addresses.";
  }
  if (message.includes("InvalidThreshold")) {
    return "The guardian threshold must be between 1 and the number of guardians.";
  }
  if (message.includes("InvalidHeartbeatTimeout")) {
    return "Proof-of-life inactivity timeout must be between 1 minute and 10 years.";
  }
  if (message.includes("InvalidUnlockDelay")) {
    return "Final timelock delay cannot exceed 365 days.";
  }
  if (message.includes("NotOwner")) {
    return "Only the vault owner can perform this action.";
  }
  if (message.includes("NotBeneficiary")) {
    return "Only the named beneficiary can request recovery or claim this vault.";
  }
  if (message.includes("NotGuardian")) {
    return "Only a listed guardian can approve this recovery request.";
  }
  if (message.includes("InactivityPeriodNotElapsed")) {
    return "The owner inactivity period has not elapsed yet. Recovery cannot be requested or claimed while the owner is still active.";
  }
  if (message.includes("DelayNotElapsed")) {
    return "The final timelock release delay has not passed yet.";
  }
  if (message.includes("ThresholdNotMet")) {
    return "Guardian approval threshold has not been reached yet.";
  }
  if (message.includes("RecoveryAlreadyActive")) {
    return "A recovery request is already active for this vault.";
  }
  if (message.includes("RecoveryNotActive")) {
    return "No active recovery request was found for this vault.";
  }
  if (message.includes("InvalidRequestId")) {
    return "This recovery request ID is invalid or has been superseded.";
  }
  if (message.includes("AlreadyApproved")) {
    return "This guardian has already approved this active recovery request.";
  }
  if (message.includes("VaultAlreadyReleased") || message.includes("VaultNotActive")) {
    return "This vault has already been released (terminal state) or is inactive.";
  }
  if (message.includes("InsufficientVaultBalance")) {
    return "Withdrawal amount exceeds the vault's credited BOT balance.";
  }
  if (message.includes("NoFundsToWithdraw")) {
    return "Please specify a positive BOT amount to withdraw.";
  }
  if (message.includes("NoFundsToRelease")) {
    return "The vault has 0 BOT balance; there are no funds to release.";
  }
  if (message.includes("TransferFailed")) {
    return "BOT transfer failed on-chain. State has been safely rolled back.";
  }
  if (message.includes("DirectDepositNotAllowed")) {
    return "Direct transfers are not permitted. Please deposit through the vault interface.";
  }
  if (message.includes("InvalidVault")) {
    return "We could not find that vault. Please check the vault ID.";
  }
  if (lower.includes("execution reverted")) {
    return "The contract rejected this action. Check that you are connected with the correct role wallet and the required conditions are met.";
  }

  return fallback;
}
