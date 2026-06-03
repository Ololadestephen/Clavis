import Link from "next/link";
import {
  Activity,
  Grid2X2,
  KeyRound,
  LockKeyhole,
  UsersRound,
} from "lucide-react";
import type React from "react";
import { SidebarWalletButton } from "./SidebarWalletButton";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Grid2X2 },
  { href: "/create-vault", label: "Create Vault", icon: LockKeyhole },
  { href: "/beneficiary", label: "Recovery", icon: KeyRound },
  { href: "/guardian", label: "Guardians", icon: UsersRound },
  { href: "/unlock", label: "Unlock", icon: Activity },
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
        </div>
      </aside>
      <section className="app-content">
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
