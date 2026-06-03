"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { connectInjectedWallet } from "./wallet";

export function LandingOpenAppButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="wallet-connect-wrap">
      <button
        className="nav-action auth-button"
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await connectInjectedWallet();
            router.push("/dashboard");
          } catch (connectError) {
            setError(connectError instanceof Error ? connectError.message : "Wallet connection failed.");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Connecting" : "Open App"}
      </button>
      {error ? <span className="wallet-connect-error">{error}</span> : null}
    </span>
  );
}
