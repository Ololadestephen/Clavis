"use client";

import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

function shortHash(hash?: string) {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export function FriendlyNotice({
  kind,
  title,
  message,
  txHash,
}: {
  kind: "loading" | "success" | "error";
  title: string;
  message?: string;
  txHash?: string;
}) {
  const [visible, setVisible] = useState(true);
  const Icon = kind === "error" ? CircleAlert : kind === "loading" ? Loader2 : CheckCircle2;

  useEffect(() => {
    setVisible(true);
    if (kind === "loading") return;
    const timer = window.setTimeout(() => setVisible(false), kind === "error" ? 10000 : 6500);
    return () => window.clearTimeout(timer);
  }, [kind, title, message, txHash]);

  if (!visible) return null;

  return (
    <div className={`friendly-notice ${kind}`} role="status">
      <Icon className={kind === "loading" ? "spin" : ""} size={18} />
      <div>
        <strong>{title}</strong>
        {message ? <span>{message}</span> : null}
        {txHash ? <code>{shortHash(txHash)}</code> : null}
      </div>
    </div>
  );
}
