"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useAuth } from "@/lib/neon-auth/client";
import { apiFetch, ApiClientError } from "@/lib/api-client";

type CallbackState = "connecting" | "connected" | "failed";

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { getToken } = useAuth();
  const started = useRef(false);
  const [state, setState] = useState<CallbackState>("connecting");
  const [message, setMessage] = useState("Securing your wallet connection...");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const completeConnection = async () => {
      const providerError = params.get("error");
      const code = params.get("code");
      const oauthState = params.get("state");
      if (providerError || !code || !oauthState) {
        setState("failed");
        setMessage(
          providerError === "access_denied"
            ? "Wallet connection was cancelled."
            : "Pollinations returned an incomplete authorization."
        );
        return;
      }

      try {
        const token = await getToken();
        await apiFetch("/pollinations/callback", {
          method: "POST",
          token,
          body: JSON.stringify({ code, state: oauthState }),
        });
        setState("connected");
        setMessage("Wallet connected. Returning to your story...");
        window.setTimeout(() => router.replace("/create-story"), 900);
      } catch (error) {
        setState("failed");
        setMessage(
          error instanceof ApiClientError
            ? error.message
            : "Unable to complete the wallet connection."
        );
      }
    };

    completeConnection();
  }, [getToken, params, router]);

  const icon =
    state === "connecting" ? (
      <LoaderCircle className="animate-spin text-cyan-300" size={30} />
    ) : state === "connected" ? (
      <CircleCheck className="text-emerald-300" size={30} />
    ) : (
      <CircleX className="text-red-300" size={30} />
    );

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#020b1f] px-5 text-white">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {icon}
        <h1 className="text-2xl font-bold">Pollinations wallet</h1>
        <p className="text-blue-100/70">{message}</p>
        {state === "failed" && (
          <button
            type="button"
            className="tc-btn-primary px-5 py-3 text-sm"
            onClick={() => router.replace("/create-story")}
          >
            Return to story creator
          </button>
        )}
      </div>
    </main>
  );
}
