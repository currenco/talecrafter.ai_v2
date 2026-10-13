import PricingPlans from "@/components/PricingPlans";

export default function PlansPage() {
  return (
    <main className="min-h-screen bg-[#0b1522] px-5 py-12 text-[#f1eadb] sm:px-8 md:py-20">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-4xl font-semibold">TaleCrafter AI plans</h1>
        <p className="mt-4 text-base leading-7 text-[#c3cbd4]">Start with your own generation account, or create with images included.</p>
      </header>
      <PricingPlans />
    </main>
  );
}
