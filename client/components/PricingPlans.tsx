import { Check, Video } from "lucide-react";
import CreatorCheckout from "./CreatorCheckout";
import TrialPlanAction from "./TrialPlanAction";

const plans = [
  {
    name: "Free trial",
    price: "$0",
    description: "Try Classic story creation with your own Pollinations key.",
    features: [
      "Read all public stories",
      "Classic story creation",
      "Images use your connected Pollinations balance",
    ],
    note: "No TaleCrafter subscription required. Images need a valid Pollinations key with available balance; free provider credits are not guaranteed. If your key expires or its balance runs out, generation stops. Choose Creator for platform-funded images.",
  },
  {
    name: "Creator",
    price: "$9",
    description: "Narration-led stories with illustrations, character bibles, and PDF exports in one monthly plan.",
    features: [
      "Public story library",
      "Create Classic and Plot Twist stories",
      "AI illustrations with no external key required",
      "Complete character bible",
      "Scene-by-scene story and prompts",
      "PDF export",
    ],
  },
];

export default function PricingPlans() {
  return (
    <div className="mx-auto max-w-4xl text-[#f1eadb] [letter-spacing:0]">
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <article id={plan.name === "Creator" ? "creator" : "free-trial"} key={plan.name} className={`scroll-mt-24 flex flex-col rounded-lg border p-6 sm:p-8 ${plan.name === "Creator" ? "border-emerald-400/50 bg-emerald-400/[0.06]" : "border-white/20 bg-white/[0.04]"}`}>
            <h3 className="text-2xl font-semibold">{plan.name}</h3>
            <p className="mt-3 min-h-12 text-sm leading-6 text-[#c3cbd4]">{plan.description}</p>
            <p className="mt-6 flex flex-wrap items-baseline gap-2">
              <span className="text-5xl font-semibold">{plan.price}</span>
              <span className="text-sm text-[#c3cbd4]">{plan.name === "Creator" ? "USD / month" : "to try"}</span>
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
              {plan.name === "Free trial" ? (
                <TrialPlanAction />
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
