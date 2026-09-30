"use client";

import Script from "next/script";
import { useContext, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/neon-auth/client";
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
    price: "INR 199",
    credits: 10,
    subtitle: "A quick refill for your next story",
    recommended: false,
  },
  {
    id: "premium",
    title: "Premium",
    price: "INR 399",
    credits: 75,
    subtitle: "More room for regular creation",
    recommended: true,
  },
  {
    id: "ultimate",
    title: "Ultimate",
    price: "INR 599",
    credits: 150,
    subtitle: "The best value for larger projects",
    recommended: false,
  },
] as const;

const MotionDiv = motion.div;

export default function BuyCreditsPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>("premium");
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const { getToken } = useAuth();

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
      const token = await getToken();
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
        theme: { color: "#2563eb" },
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
    <main className="relative min-h-screen overflow-hidden bg-[#020b1f] px-5 py-10 md:px-16 lg:px-28 xl:px-40">
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
          <h1 className="tc-title-gradient text-3xl font-extrabold md:text-5xl">
            Add story credits
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-blue-100/75 md:text-base">
            Current balance: {userDetail?.credit ?? "-"} credits
          </p>
        </header>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {paidPlans.map((plan, index) => {
            const selected = selectedPlan === plan.id;
            return (
              <MotionDiv
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className={`flex min-h-72 flex-col justify-between rounded-lg border p-6 shadow-xl transition ${
                  selected
                    ? "border-blue-200/70 bg-blue-600/20"
                    : "border-blue-300/20 bg-white/[0.04] hover:border-blue-300/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-white">{plan.title}</h2>
                    {plan.recommended && (
                      <span className="text-xs font-semibold text-cyan-200">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-blue-100/65">{plan.subtitle}</p>
                  <p className="mt-5 text-4xl font-extrabold text-white">
                    {plan.price}
                  </p>
                  <p className="mt-5 flex items-center text-sm text-blue-100/85">
                    <HiOutlineCheckCircle
                      className="mr-2 text-lg text-emerald-300"
                      aria-hidden="true"
                    />
                    {plan.credits} credits
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  aria-pressed={selected}
                  className={`mt-7 w-full rounded-lg border px-4 py-3 text-sm font-semibold text-white transition ${
                    selected
                      ? "border-blue-200/60 bg-blue-700"
                      : "border-blue-300/25 bg-white/10 hover:bg-white/15"
                  }`}
                >
                  {selected ? "Selected" : `Choose ${plan.title}`}
                </button>
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
