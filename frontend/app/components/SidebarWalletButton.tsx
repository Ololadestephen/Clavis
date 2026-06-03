"use client";

import { LogOut, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import {
  connectInjectedWallet,
  disconnectInjectedWallet,
  formatAccount,
  getStoredWalletAccount,
} from "./wallet";

export function SidebarWalletButton() {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAccount(getStoredWalletAccount());

    function handleWalletChange(event: Event) {
      setAccount((event as CustomEvent<string | null>).detail);
    }

    window.addEventListener("clavis-wallet-change", handleWalletChange);
    return () => window.removeEventListener("clavis-wallet-change", handleWalletChange);
  }, []);

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
      <div>
        <span>Connected</span>
        <strong>{formatAccount(account)}</strong>
      </div>
      <button
        className="sidebar-account-button"
        type="button"
        onClick={() => {
          disconnectInjectedWallet();
          setAccount(null);
        }}
      >
        <LogOut size={16} />
        Disconnect
      </button>
    </div>
  );
}
