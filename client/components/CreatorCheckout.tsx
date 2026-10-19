"use client";

import Link from "next/link";
import Script from "next/script";
import { useContext, useEffect, useState } from "react";
import { UserDetailContext, type UserDetail } from "@/app/_context/UserDetailContext";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import { authHref } from "@/lib/auth-navigation";
import { userErrorMessage } from "@/lib/user-messages";
import { legalContactEmail } from "@/lib/legal/policies";

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
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let ignore = false;
    setLoaded(false);
    setLoadFailed(false);
    setEnabled(false);
    setMessage("");
    setConsent(false);
    if (!isSignedIn) {
      void apiFetch<{ checkoutEnabled: boolean }>("/payments/availability")
        .then(result => { if (!ignore) { setEnabled(result.checkoutEnabled); setLoaded(true); } })
        .catch(() => { if (!ignore) { setLoadFailed(true); setMessage("We couldn't check checkout availability. Please try again."); setLoaded(true); } });
      return () => { ignore = true; };
    }
    void getAccessToken().then(token => apiFetch<SubscriptionResult>("/payments/subscription", { token }))
      .then(result => {
        if (!ignore) { setEnabled(result.checkoutEnabled); setUserDetail(result.user); setLoaded(true); }
      }).catch(() => {
        if (!ignore) { setLoadFailed(true); setMessage("We couldn't check your subscription. Please try again before making a payment."); setLoaded(true); }
      });
    return () => { ignore = true; };
  }, [isSignedIn, authUser?.id, setUserDetail, reload]);

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
        result.user.plan === "creator" ? "You're on Creator. You can start creating stories." : "Creator isn't active yet. If you just paid, wait a moment and check again before paying twice.");
    } catch (error) { setMessage(userErrorMessage(error, "We couldn't update your subscription. Check its status before trying again.")); }
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
            setMessage(result.user.plan === "creator" ? "Welcome to Creator! You're ready to create illustrated stories." :
              "Your subscription is set up. We're waiting for payment confirmation. Choose Check payment status before making another payment.");
          } catch { setMessage("We couldn't confirm your payment yet. Choose Check payment status before paying again. Contact us if you've been charged and Creator still isn't active."); }
          finally { setBusy(false); }
        },
      });
      checkout.on("payment.failed", () => {
        setMessage("Your payment wasn't completed. Check its status before retrying if your bank shows a charge; otherwise, try another payment method.");
        setBusy(false);
      });
      checkout.open();
    } catch (error) { setMessage(userErrorMessage(error, "We couldn't open checkout. Please try again shortly.")); setBusy(false); }
  };
  const button = "min-h-11 w-full rounded-md border border-emerald-300/40 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
  if (!isAuthLoaded || !loaded) return <div className="min-h-11 animate-pulse rounded-md bg-white/10" role="status" aria-label="Checking subscription options" />;
  if (loadFailed) return <div className="space-y-3 text-sm"><p role="alert">{message}</p><button className={button} onClick={() => setReload(value => value + 1)}>Try again</button></div>;
  if (!isSignedIn) return enabled ?
    <Link className={button + " block bg-emerald-200 text-center text-emerald-950 hover:bg-emerald-100"} href={authHref("/sign-up", "/pricing#creator")}>Get Creator</Link> :
    <div className="space-y-3 text-sm"><p>Creator checkout is currently unavailable. Please check back later.</p><Link href={authHref("/sign-up", "/create-story")} className={button + " block text-center"}>Start free trial</Link></div>;
  return (
    <div className="space-y-3 text-sm">
      {enabled && <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setReady(true)} onError={() => setMessage("Secure checkout couldn't load. Check your connection, then reload this page.")} />}
      {userDetail?.plan === "creator" ? (
        <>
          <p>{userDetail.cancelAtPeriodEnd ? "Creator access ends" : "Creator is active. Current paid period ends"}{userDetail.paidThrough ? ` on ${new Date(userDetail.paidThrough).toLocaleDateString()}` : " at the end of your billing period"}.</p>
          <Link href="/create-story" className={button + " block bg-emerald-200 text-center text-emerald-950"}>Create a story</Link>
          <button className={button} onClick={() => void update("cancel")} disabled={busy || userDetail.cancelAtPeriodEnd}>
            {userDetail.cancelAtPeriodEnd ? "Renewal cancelled" : "Cancel automatic renewal"}
          </button>
        </>
      ) : enabled ? (
        <>
          <div className="border-t border-white/15 pt-4">
            <label className="flex items-start gap-2 text-xs leading-5">
              <input type="checkbox" className="mt-1 shrink-0 accent-emerald-300" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />
              I agree to $9 USD/month, automatic renewal. Cancel before the next billing date.
            </label>
            <button className={button + " mt-3 bg-emerald-200 text-emerald-950 hover:bg-emerald-100"} onClick={() => void subscribe()} disabled={!loaded || !ready || !consent || busy}>
              {busy ? "Processing..." : "Subscribe for $9 / month"}
            </button>
            {!ready && <p role="status" className="mt-2 text-xs">Loading secure checkout...</p>}
          </div>
        </>
      ) : <div className="space-y-3"><p>Creator checkout is currently unavailable. Please check back later.</p><Link href="/create-story" className={button + " block text-center"}>Create a Classic story</Link></div>}
      {userDetail?.subscriptionStatus && <button className={button} disabled={busy} onClick={() => void update("refresh")}>{busy ? "Checking..." : "Check payment status"}</button>}
      {userDetail?.subscriptionStatus && userDetail.plan !== "creator" && !["cancelled", "expired", "completed"].includes(userDetail.subscriptionStatus) &&
        <button className={button} disabled={busy || userDetail.cancelAtPeriodEnd} onClick={() => void update("cancel")}>Cancel subscription</button>}
      {message && <div className="text-xs leading-5"><p role="status">{message}</p><a className="mt-2 inline-block text-emerald-200 underline" href={`mailto:${legalContactEmail}`}>Contact support</a></div>}
    </div>
  );
}
