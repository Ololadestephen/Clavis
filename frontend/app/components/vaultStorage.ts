"use client";

export type StoredVault = {
  contractAddress?: string;
  vaultId?: string;
  uuid?: number;
  txHashes?: {
    create?: string;
    deposit?: string;
    withdraw?: string;
    heartbeat?: string;
  };
  beneficiary?: string;
  guardians?: string[];
  threshold?: number;
  balance?: string;
  status?: "Active" | "Released" | "NonExistent";
  heartbeatDays?: number;
  unlockDelayHours?: number;
  heartbeatValue?: number;
  heartbeatUnit?: string;
  unlockDelayValue?: number;
  unlockDelayUnit?: string;
  createdAt?: string;
  lastHeartbeatAt?: string;
};

export function getLastCreatedVault(contractAddress?: string): StoredVault | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("clavis:last-created-vault");
  if (!raw) return null;
  try {
    const vault = JSON.parse(raw) as StoredVault;
    if (
      contractAddress &&
      vault.contractAddress &&
      vault.contractAddress.toLowerCase() !== contractAddress.toLowerCase()
    ) {
      return null;
    }
    return vault;
  } catch {
    return null;
  }
}

export function saveLastCreatedVault(vault: StoredVault) {
  if (typeof window === "undefined") return;
  localStorage.setItem("clavis:last-created-vault", JSON.stringify(vault));
}
