"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Grid2X2,
  KeyRound,
  LockKeyhole,
  UsersRound,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { SidebarWalletButton } from "./SidebarWalletButton";
import {
  BOTCHAIN_MAINNET_CHAIN_ID,
  getCurrentChainId,
  getStoredWalletAccount,
  switchNetworkToBotChainMainnet,
} from "./wallet";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Grid2X2 },
  { href: "/create-vault", label: "Create Vault", icon: LockKeyhole },
  { href: "/beneficiary", label: "Recovery", icon: KeyRound },
  { href: "/guardian", label: "Guardians", icon: UsersRound },
  { href: "/unlock", label: "Release", icon: Activity },
];

export function AppShell({
  title,
  eyebrow,
  description,
  active,
  children,
}: {
  title: string;
  eyebrow?: string;
  description: string;
  active: string;
  children: React.ReactNode;
}) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
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

  return (
    <main className="app-page">
      <div className="app-bg" aria-hidden="true">
        <div className="app-moon" />
        <div className="app-fog" />
      </div>
      <aside className="app-sidebar">
        <Link className="sidebar-brand" href="/" aria-label="Back to Clavis landing page">
          <img src="/clavis-wordmark.png" alt="Clavis" />
        </Link>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={active === item.label ? "active" : ""}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <SidebarWalletButton />
          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              color: "var(--muted)",
            }}
          >
            <a
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
            >
              BOT Scan <ExternalLink size={11} />
            </a>
            <a
              href="https://www.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
            >
              BOT Chain <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </aside>
      <section className="app-content">
        {isWrongNetwork ? (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#fca5a5" }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span>
                <strong>Wrong Network:</strong> Clavis runs exclusively on <strong>BOT Chain Mainnet</strong> (Chain ID
                677).
              </span>
            </div>
            <button
              type="button"
              disabled={switching}
              onClick={async () => {
                setSwitching(true);
                try {
                  await switchNetworkToBotChainMainnet();
                  const updated = await getCurrentChainId();
                  setChainId(updated);
                } catch {
                  // user cancelled or error
                } finally {
                  setSwitching(false);
                }
              }}
              style={{
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "0.35rem 0.75rem",
                fontWeight: "bold",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {switching ? "Switching..." : "Switch to BOT Chain Mainnet"}
            </button>
          </div>
        ) : null}

        <div className="app-heading">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
