"use client";

export const CLAVIS_CONNECTED_ACCOUNT = "clavis:connected-account";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function formatAccount(value?: string | null) {
  if (!value) return "Connected wallet";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function connectInjectedWallet() {
  if (!window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask, Rabby, or OKX Wallet.");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  const account = accounts[0];

  if (!account) {
    throw new Error("No wallet account returned.");
  }

  localStorage.setItem(CLAVIS_CONNECTED_ACCOUNT, account);
  window.dispatchEvent(new CustomEvent("clavis-wallet-change", { detail: account }));
  return account;
}

export function disconnectInjectedWallet() {
  localStorage.removeItem(CLAVIS_CONNECTED_ACCOUNT);
  window.dispatchEvent(new CustomEvent("clavis-wallet-change", { detail: null }));
}

export function getStoredWalletAccount() {
  return localStorage.getItem(CLAVIS_CONNECTED_ACCOUNT);
}
