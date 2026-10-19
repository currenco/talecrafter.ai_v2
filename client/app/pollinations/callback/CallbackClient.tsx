"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { getAccessToken } from "@/lib/neon-auth/client";
import { apiFetch } from "@/lib/api-client";
import { userErrorMessage } from "@/lib/user-messages";

type CallbackState = "connecting" | "connected" | "failed";

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const started = useRef(false);
  const [state, setState] = useState<CallbackState>("connecting");
  const [message, setMessage] = useState("Connecting your Pollinations key...");

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
            ? "You cancelled the connection. Return to Create Story whenever you're ready to try again."
            : "We couldn't complete the connection. Return to Create Story and connect your key again."
        );
        return;
      }

      try {
        const token = await getAccessToken();
        await apiFetch("/pollinations/callback", {
          method: "POST",
          token,
          body: JSON.stringify({ code, state: oauthState }),
        });
        setState("connected");
        setMessage("Your key is connected. Taking you back to Create Story...");
        window.setTimeout(() => router.replace("/create-story"), 900);
      } catch (error) {
        setState("failed");
        setMessage(userErrorMessage(error, "We couldn't connect your key. Return to Create Story and try again."));
      }
    };

    completeConnection();
  }, [params, router]);

  const icon =
    state === "connecting" ? (
      <LoaderCircle className="animate-spin text-[#d8c69e]" size={30} />
    ) : state === "connected" ? (
      <CircleCheck className="text-emerald-300" size={30} />
    ) : (
      <CircleX className="text-red-300" size={30} />
    );

  return (
    <main className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-[#0b1522] px-5 text-[#c3cbd4]">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(67,91,117,0.45),transparent_55%)]" />
      <div className="relative flex max-w-md flex-col items-center gap-4 rounded-[2rem] border border-[#d8c69e]/20 bg-[#111d2b]/85 p-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
        {icon}
        <h1 className="font-serif text-3xl font-medium text-[#f1eadb]">Connect your key</h1>
        <p className="text-[#c3cbd4]/70">{message}</p>
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
