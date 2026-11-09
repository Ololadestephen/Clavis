"use client";

import { AlertTriangle, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BOTCHAIN_MAINNET_CHAIN_ID,
  connectInjectedWallet,
  disconnectInjectedWallet,
  formatAccount,
  getCurrentChainId,
  getStoredWalletAccount,
  switchNetworkToBotChainMainnet,
} from "./wallet";

export function SidebarWalletButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setAccount(getStoredWalletAccount());

    async function checkChain() {
      const current = await getCurrentChainId();
      setChainId(current);
    }
    void checkChain();

    function handleWalletChange(event: Event) {
      setAccount((event as CustomEvent<string | null>).detail);
      void checkChain();
    }

    function handleNetworkChange(event: Event) {
      setChainId((event as CustomEvent<number>).detail);
    }

    function handleChainChanged(rawChainId: unknown) {
      const parsed = typeof rawChainId === "string" ? Number.parseInt(rawChainId, 16) : null;
      setChainId(parsed);
      window.dispatchEvent(new CustomEvent("clavis-network-change", { detail: parsed }));
    }

    window.addEventListener("clavis-wallet-change", handleWalletChange);
    window.addEventListener("clavis-network-change", handleNetworkChange);
    window.ethereum?.on?.("chainChanged", handleChainChanged);

    return () => {
      window.removeEventListener("clavis-wallet-change", handleWalletChange);
      window.removeEventListener("clavis-network-change", handleNetworkChange);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const isWrongNetwork = account && chainId !== null && chainId !== BOTCHAIN_MAINNET_CHAIN_ID;

  if (!account) {
    return (
      <div className="sidebar-account">
        <button
          className="sidebar-account-button"
          type="button"
          onClick={async () => {
            setError(null);
            try {
              const nextAccount = await connectInjectedWallet();
              setAccount(nextAccount);
              const currentChain = await getCurrentChainId();
              setChainId(currentChain);
            } catch (connectError) {
              setError(connectError instanceof Error ? connectError.message : "Wallet connection failed.");
            }
          }}
        >
          <Wallet size={16} />
          Connect wallet
        </button>
        {error ? <p className="sidebar-account-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="sidebar-account">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Connected</span>
          <button
            type="button"
            onClick={() => {
              disconnectInjectedWallet();
              setAccount(null);
              setChainId(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.2rem",
              fontSize: "0.75rem",
            }}
            title="Disconnect"
          >
            <LogOut size={12} />
          </button>
        </div>
        <strong>{formatAccount(account)}</strong>
      </div>

      {isWrongNetwork ? (
        <button
          type="button"
          disabled={switching}
          onClick={async () => {
            setSwitching(true);
            try {
              await switchNetworkToBotChainMainnet();
              const updated = await getCurrentChainId();
              setChainId(updated);
            } catch (switchErr) {
              setError(switchErr instanceof Error ? switchErr.message : "Could not switch network.");
            } finally {
              setSwitching(false);
            }
          }}
          style={{
            marginTop: "0.5rem",
            padding: "0.4rem 0.6rem",
            backgroundColor: "#ef4444",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: "bold",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
            cursor: "pointer",
            width: "100%",
          }}
        >
          <AlertTriangle size={13} />
          {switching ? "Switching..." : "Switch to BOT Chain"}
        </button>
      ) : (
        <div
          style={{
            marginTop: "0.4rem",
            fontSize: "0.72rem",
            color: "#22c55e",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <ShieldCheck size={12} /> BOT Chain Mainnet
        </div>
      )}

      {error ? <p className="sidebar-account-error">{error}</p> : null}
    </div>
  );
}
