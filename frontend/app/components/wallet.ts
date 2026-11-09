"use client";

export const CLAVIS_CONNECTED_ACCOUNT = "clavis:connected-account";
export const BOTCHAIN_MAINNET_CHAIN_ID = 677;
export const BOTCHAIN_MAINNET_CHAIN_ID_HEX = "0x2a5";
export const BOTCHAIN_MAINNET_RPC = "https://rpc.botchain.ai";
export const BOTCHAIN_MAINNET_EXPLORER = "https://scan.botchain.ai";
export const BOTCHAIN_MAINNET_NAME = "BOT Chain Mainnet";

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

export async function getCurrentChainId(): Promise<number | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const hex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    return Number.parseInt(hex, 16);
  } catch {
    return null;
  }
}

export async function isBotChainMainnet(): Promise<boolean> {
  const chainId = await getCurrentChainId();
  return chainId === BOTCHAIN_MAINNET_CHAIN_ID;
}

export async function switchNetworkToBotChainMainnet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask, Rabby, or OKX Wallet.");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BOTCHAIN_MAINNET_CHAIN_ID_HEX }],
    });
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err?.code === 4902 || err?.message?.includes("Unrecognized chain")) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BOTCHAIN_MAINNET_CHAIN_ID_HEX,
            chainName: BOTCHAIN_MAINNET_NAME,
            nativeCurrency: {
              name: "BOT",
              symbol: "BOT",
              decimals: 18,
            },
            rpcUrls: [BOTCHAIN_MAINNET_RPC],
            blockExplorerUrls: [BOTCHAIN_MAINNET_EXPLORER],
          },
        ],
      });
    } else {
      throw error;
    }
  }

  window.dispatchEvent(new CustomEvent("clavis-network-change", { detail: BOTCHAIN_MAINNET_CHAIN_ID }));
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

  // Ensure user is on BOT Chain Mainnet
  try {
    await switchNetworkToBotChainMainnet();
  } catch {
    // Let the user connect, but network checks will display the wrong-network banner
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
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLAVIS_CONNECTED_ACCOUNT);
}
