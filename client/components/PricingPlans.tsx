import Link from "next/link";
import { ArrowRight, Check, Video } from "lucide-react";
import CreatorCheckout from "./CreatorCheckout";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Explore stories. Bring your own key to create a classic story.",
    features: [
      "Read all public stories",
      "Sign in with Google or GitHub",
      "Classic story creation",
      "GitHub account required to create",
      "Images use your connected Pollinations balance",
      "Up to 3 story projects per calendar month",
      "24 generated images per calendar month",
      "6 image-to-story ideas per calendar month",
    ],
    note: "A funded Pollinations account is required for image generation. Provider limits apply.",
  },
  {
    name: "Creator",
    price: "$9",
    description: "Your story, illustrated. Generation included in one monthly plan.",
    features: [
      "Public story library",
      "Sign in and create with Google or GitHub",
      "Create classic and branching stories",
      "AI illustrations with no external key required",
      "Complete character bible",
      "Scene-by-scene story and prompts",
      "PDF export",
      "Up to 15 story projects per billing month",
      "120 generated images per billing month",
      "60 image-to-story ideas per billing month",
    ],
  },
];

export default function PricingPlans() {
  return (
    <div className="mx-auto max-w-4xl text-[#f1eadb] [letter-spacing:0]">
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.name} className={`flex flex-col rounded-lg border p-6 sm:p-8 ${plan.name === "Creator" ? "border-emerald-400/50 bg-emerald-400/[0.06]" : "border-white/20 bg-white/[0.04]"}`}>
            <h3 className="text-2xl font-semibold">{plan.name}</h3>
            <p className="mt-3 min-h-12 text-sm leading-6 text-[#c3cbd4]">{plan.description}</p>
            <p className="mt-6 flex flex-wrap items-baseline gap-2">
              <span className="text-5xl font-semibold">{plan.price}</span>
              <span className="text-sm text-[#c3cbd4]">{plan.name === "Creator" ? "USD / month" : "forever"}</span>
            </p>
            <ul className="my-7 space-y-3 border-t border-white/15 pt-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm leading-6">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {plan.note && <p className="mb-6 text-xs leading-5 text-[#c3cbd4]">{plan.note}</p>}
            <div className="mt-auto">
              {plan.name === "Free" ? (
                <Link href="/explore" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/30 px-4 py-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                  Explore public stories <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <CreatorCheckout />
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8 flex items-start gap-3 border-t border-white/15 pt-6 text-sm text-[#c3cbd4]">
        <Video size={20} className="shrink-0 text-emerald-300" aria-hidden="true" />
        <p>Complete short films: coming soon. Video generation is not included in these plans.</p>
      </div>
    </div>
  );
}
