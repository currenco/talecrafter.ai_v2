"use client";

import Link from "next/link";
import Script from "next/script";
import { useContext, useEffect, useState } from "react";
import { UserDetailContext, type UserDetail } from "@/app/_context/UserDetailContext";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";

type SubscriptionResult = { user: UserDetail; checkoutEnabled: boolean };
type PaymentResult = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};
type Checkout = {
  open: () => void;
  on: (event: "payment.failed", callback: (event: { error?: { description?: string } }) => void) => void;
};
declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string; subscription_id: string; name: string; description: string;
      handler: (result: PaymentResult) => void;
      modal: { ondismiss: () => void };
      prefill: { name?: string; email?: string };
    }) => Checkout;
  }
}

export default function CreatorCheckout() {
  const { userDetail, setUserDetail, isAuthLoaded, isSignedIn, authUser } = useContext(UserDetailContext);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let ignore = false;
    setLoaded(false);
    setEnabled(false);
    setMessage("");
    setConsent(false);
    if (!isSignedIn) {
      void apiFetch<{ checkoutEnabled: boolean }>("/payments/availability")
        .then(result => { if (!ignore) { setEnabled(result.checkoutEnabled); setLoaded(true); } })
        .catch(() => { if (!ignore) { setMessage("Unable to load plan availability. Please refresh."); setLoaded(true); } });
      return () => { ignore = true; };
    }
    void getAccessToken().then(token => apiFetch<SubscriptionResult>("/payments/subscription", { token }))
      .then(result => {
        if (!ignore) { setEnabled(result.checkoutEnabled); setUserDetail(result.user); setLoaded(true); }
      }).catch(() => {
        if (!ignore) { setMessage("Unable to load subscription status. Refresh to retry."); setLoaded(true); }
      });
    return () => { ignore = true; };
  }, [isSignedIn, authUser?.id, setUserDetail]);

  const update = async (action: "refresh" | "cancel") => {
    if (action === "cancel" && !window.confirm("Cancel automatic renewal? Creator stays available until your paid period ends.")) return;
    setBusy(true);
    setMessage("");
    try {
      const token = await getAccessToken();
      const result = await apiFetch<SubscriptionResult>(`/payments/subscription/${action}`, { method: "POST", token });
      setUserDetail(result.user);
      setEnabled(result.checkoutEnabled);
      setMessage(action === "cancel" ? "Automatic renewal cancelled. Your paid access remains until the end of the billing period." :
        result.user.plan === "creator" ? "Creator is active." : "No active paid period yet. Payment confirmation may still be pending.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update subscription."); }
    finally { setBusy(false); }
  };
  const subscribe = async () => {
    if (!enabled || !loaded || !consent || !window.Razorpay || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const token = await getAccessToken();
      const created = await apiFetch<{ key: string; subscriptionId: string }>("/payments/subscription", { method: "POST", token });
      const pending = await apiFetch<SubscriptionResult>("/payments/subscription", { token });
      setUserDetail(pending.user);
      const checkout = new window.Razorpay({
        key: created.key, subscription_id: created.subscriptionId,
        name: "TaleCrafter AI", description: "Creator - USD 9 monthly",
        prefill: { name: userDetail?.userName ?? undefined, email: userDetail?.userEmail },
        modal: { ondismiss: () => setBusy(false) },
        handler: async response => {
          try {
            const result = await apiFetch<SubscriptionResult>("/payments/subscription/verify", {
              method: "POST", token: await getAccessToken(),
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySubscriptionId: response.razorpay_subscription_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            setUserDetail(result.user);
            setMessage(result.user.plan === "creator" ? "Creator is active. Your images are included." :
              "Subscription authorised. Access begins when the monthly payment is confirmed. Use Refresh status to check.");
          } catch (error) { setMessage(error instanceof Error ? error.message : "Verification pending. Refresh status before attempting another payment."); }
          finally { setBusy(false); }
        },
      });
      checkout.on("payment.failed", result => {
        setMessage(result.error?.description ?? "Payment failed. No new access has been granted.");
        setBusy(false);
      });
      checkout.open();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to start checkout."); setBusy(false); }
  };
  const button = "min-h-11 w-full rounded-md border border-emerald-300/40 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
  if (!isAuthLoaded) return <p role="status">Loading account...</p>;
  if (!isSignedIn) return !loaded ? <p role="status">Loading plans...</p> : enabled ?
    <Link className={button + " block text-center"} href="/sign-in?redirect=/pricing">Sign in to choose Creator</Link> :
    <div className="space-y-3 text-sm"><p>{message || "Creator is coming soon. Payments are not open yet."}</p><Link href="/create-story" className={button + " block text-center"}>Start with Free</Link></div>;
  return (
    <div className="space-y-3 text-sm">
      {enabled && <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setReady(true)} onError={() => setMessage("Checkout could not load. Refresh to retry.")} />}
      {userDetail?.plan === "creator" ? (
        <>
          <p>Creator active{userDetail.paidThrough ? ` until ${new Date(userDetail.paidThrough).toLocaleDateString()}` : ""}.</p>
          <button className={button} onClick={() => void update("cancel")} disabled={busy || userDetail.cancelAtPeriodEnd}>
            {userDetail.cancelAtPeriodEnd ? "Renewal cancelled" : "Cancel automatic renewal"}
          </button>
        </>
      ) : enabled ? (
        <>
          <details className="border-t border-white/20 pt-3">
            <summary className="cursor-pointer font-semibold">Subscription details and allowances</summary>
            <p className="my-3 text-xs leading-5">USD 9 billed automatically every month. Includes up to 15 story projects, 120 images and 60 image-to-story ideas per billing month. Covers, references and requested variations count. Unused monthly allowances do not roll over. Cancel renewal here before your next billing date. Video is not included. The mandate lasts up to 120 monthly payments.</p>
          </details>
          <label className="flex items-start gap-2 text-xs leading-5">
            <input type="checkbox" className="mt-1" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />
            I agree to $9 USD billed monthly, automatic renewal and the plan allowances. Cancel renewal before the next billing date.
          </label>
          <button className={button + " bg-emerald-200 text-emerald-950"} onClick={() => void subscribe()} disabled={!loaded || !ready || !consent || busy}>
            {busy ? "Processing..." : !ready ? "Loading secure checkout..." : "Subscribe for $9 / month"}
          </button>
        </>
      ) : <div className="space-y-3"><p>{loaded ? "Creator is coming soon. Payments are not open yet." : "Loading subscription..."}</p>{loaded && <Link href="/create-story" className={button + " block text-center"}>Start with Free</Link>}</div>}
      {userDetail?.subscriptionStatus && <button className={button} disabled={busy} onClick={() => void update("refresh")}>Refresh status</button>}
      {userDetail?.subscriptionStatus && userDetail.plan !== "creator" && !["cancelled", "expired", "completed"].includes(userDetail.subscriptionStatus) &&
        <button className={button} disabled={busy || userDetail.cancelAtPeriodEnd} onClick={() => void update("cancel")}>Cancel subscription</button>}
      {message && <p role="status" className="text-xs leading-5">{message}</p>}
    </div>
  );
}
