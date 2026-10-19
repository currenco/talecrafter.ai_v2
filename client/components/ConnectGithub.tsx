"use client";

import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { authClient } from "@/lib/neon-auth/client";
import { userErrorMessage } from "@/lib/user-messages";

export default function ConnectGithub() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const connect = async () => {
    setPending(true);
    setError("");
    try {
      const result = await authClient.linkSocial({
        provider: "github",
        callbackURL: `${window.location.origin}/create-story`,
      });
      if (result.error) throw result.error;
    } catch (error) {
      setError(userErrorMessage(error, "We couldn't connect GitHub. Try again and allow access when GitHub asks."));
      setPending(false);
    }
  };
  return (
    <div className="my-6 text-sm text-[#f1eadb]">
      <p className="mb-3">Connect GitHub to create on Free trial. Your existing account and stories stay with you.</p>
      <button type="button" onClick={connect} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/30 px-4 disabled:opacity-50">
        <FaGithub size={18} aria-hidden="true" />{pending ? "Connecting..." : "Connect GitHub"}
      </button>
      {error && <p role="alert" className="mt-2 text-red-300">{error}</p>}
    </div>
  );
}
