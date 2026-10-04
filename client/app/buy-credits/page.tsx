"use client";

import Script from "next/script";
import { useContext, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import { UserDetailContext, type UserDetail } from "../_context/UserDetailContext";

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: { description?: string };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpaySuccess) => void | Promise<void>;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const paidPlans = [
  {
    id: "basic",
    title: "Basic",
    price: "$199",
    credits: 10,
    subtitle: "A quick refill for your next story",
    features: ["10 story credits", "Classic and Plot Twist modes", "Secure one-time payment"],
    recommended: false,
  },
  {
    id: "premium",
    title: "Premium",
    price: "$399",
    credits: 75,
    subtitle: "More room for regular creation",
    features: ["75 story credits", "Classic and Plot Twist modes", "Secure one-time payment"],
    recommended: true,
  },
  {
    id: "ultimate",
    title: "Ultimate",
    price: "$599",
    credits: 150,
    subtitle: "The best value for larger projects",
    features: ["150 story credits", "Classic and Plot Twist modes", "Secure one-time payment"],
    recommended: false,
  },
] as const;

const MotionDiv = motion.div;

export default function BuyCreditsPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>("premium");
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { userDetail, setUserDetail } = useContext(UserDetailContext);

  useEffect(() => {
    setCheckoutReady(Boolean(window.Razorpay));
  }, []);

  const startCheckout = async () => {
    const plan = paidPlans.find(item => item.id === selectedPlan);
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!plan) {
      toast.error("Select a credit plan first.");
      return;
    }
    if (!key || !window.Razorpay) {
      toast.error("Secure checkout is unavailable. Please try again shortly.");
      return;
    }

    setCheckoutLoading(true);
    try {
      const token = await getAccessToken();
      const order = await apiFetch<{
        orderId: string;
        amount: number;
        currency: string;
      }>("/payments/razorpay/orders", {
        method: "POST",
        token,
        body: JSON.stringify({ planId: plan.id }),
      });

      let paymentCompleted = false;
      let paymentFailed = false;
      const checkout = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: "TaleCrafter AI",
        description: `${plan.credits} story credits`,
        order_id: order.orderId,
        prefill: {
          name: userDetail?.userName ?? undefined,
          email: userDetail?.userEmail,
        },
        theme: { color: "#d8c69e" },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            if (!paymentCompleted && !paymentFailed) {
              toast.info("Payment cancelled.");
            }
          },
        },
        handler: async response => {
          paymentCompleted = true;
          try {
            const result = await apiFetch<{
              status: string;
              user: UserDetail;
            }>("/payments/razorpay/verify", {
              method: "POST",
              token,
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            setUserDetail(result.user);
            toast.success("Payment successful. Credits added to your account.");
          } catch {
            toast.error(
              "Payment completed, but verification failed. Please contact support."
            );
          } finally {
            setCheckoutLoading(false);
          }
        },
      });

      checkout.on("payment.failed", response => {
        paymentFailed = true;
        setCheckoutLoading(false);
        toast.error(response.error?.description || "Payment failed. Please retry.");
      });
      checkout.open();
    } catch {
      setCheckoutLoading(false);
      toast.error("Unable to start secure checkout. Please try again.");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b1522] px-5 py-10 md:px-16 lg:px-28 xl:px-40">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setCheckoutReady(true)}
        onError={() => {
          setCheckoutReady(false);
          toast.error("Unable to load secure checkout.");
        }}
      />
      <div className="tc-hero-grid absolute inset-0 opacity-35" />

      <div className="relative mx-auto max-w-6xl">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8c69e]">Credit shop</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#f1eadb] md:text-6xl">
            Add story credits
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#c3cbd4]/75 md:text-base">
            Current balance: {userDetail?.credit ?? "-"} credits
          </p>
        </header>

        <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
          {paidPlans.map((plan, index) => {
            const selected = selectedPlan === plan.id;
            return (
              <MotionDiv
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className={`flex min-h-[440px] flex-col rounded-[2rem] border p-8 shadow-[0_28px_80px_rgba(0,0,0,0.22)] transition ${
                  selected
                    ? "border-[#d8c69e]/70 bg-[#d8c69e]/12"
                    : "border-[#d8c69e]/20 bg-white/[0.04] hover:border-[#d8c69e]/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-[#f1eadb]">{plan.title}</h2>
                    {plan.recommended && (
                      <span className="text-xs font-semibold text-[#d8c69e]">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#c3cbd4]/65">{plan.subtitle}</p>
                  <p className="mt-5 text-4xl font-extrabold text-[#f1eadb]">
                    {plan.price}
                  </p>
                  <p className="mt-5 flex items-center text-sm text-[#c3cbd4]/85">
                    <HiOutlineCheckCircle
                      className="mr-2 text-lg text-emerald-300"
                      aria-hidden="true"
                    />
                    {plan.credits} credits
                  </p>
                  <ul className="mt-7 space-y-3 border-t border-[#d8c69e]/15 pt-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-[#c3cbd4]/75">
                        <HiOutlineCheckCircle
                          className="mt-0.5 shrink-0 text-lg text-[#d8c69e]"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto pt-8">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    aria-pressed={selected}
                    className={`w-full rounded-full border px-4 py-3 text-sm font-semibold transition ${
                      selected
                        ? "border-[#e2d2ae] bg-[#d8c69e] text-[#101a28]"
                        : "border-[#d8c69e]/25 bg-white/[0.05] text-[#f1eadb] hover:bg-[#d8c69e]/10"
                    }`}
                  >
                    {selected ? "Selected" : `Choose ${plan.title}`}
                  </button>
                </div>
              </MotionDiv>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-xl text-center">
          <button
            type="button"
            onClick={startCheckout}
            disabled={!checkoutReady || checkoutLoading}
            className="tc-btn-primary w-full px-6 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkoutLoading
              ? "Processing payment..."
              : checkoutReady
                ? "Pay securely with Razorpay"
                : "Loading secure checkout..."}
          </button>
        </div>
      </div>
    </main>
  );
}
