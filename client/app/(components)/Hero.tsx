"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  Download,
  GitBranch,
  ImageIcon,
  Languages,
  Mic2,
  Upload,
} from "lucide-react";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

const MotionDiv = motion.div;

const HERO_SUBTEXT =
  "Turn a prompt or image into a complete illustrated book. Choose a classic story, or shape every turning point yourself with Plot Twist mode.";
const HERO_TEXT_DURATION = 0.4;
const HERO_TEXT_STAGGER = 0.035;
const HERO_TEXT_START_DELAY = 0.8;
const HERO_ACTION_DELAY_MS = Math.ceil(
  (HERO_TEXT_START_DELAY +
    (HERO_SUBTEXT.split(" ").length - 1) * HERO_TEXT_STAGGER +
    HERO_TEXT_DURATION) *
    1000
);

type StatItem = {
  value: number;
  suffix?: string;
  label: string;
};

const heroStats: StatItem[] = [
  { value: 40, suffix: "+", label: "Languages" },
  { value: 9, label: "Story Genres" },
  { value: 7, label: "Art Styles" },
  { value: 30, suffix: "+", label: "Countries Reached" },
];

const AnimatedStat = ({ stat, index }: { stat: StatItem; index: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated) return;

        setHasAnimated(true);
        const duration = 1300;
        const start = performance.now();

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          setDisplayValue(Math.round(stat.value * easedProgress));

          if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      },
      { threshold: 0.45 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasAnimated, stat.value]);

  return (
    <MotionDiv
      ref={ref}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.35 }}
      transition={{ delay: index * 0.08, duration: 0.55 }}
      variants={{
        hidden: { opacity: 0, y: 26 },
        show: { opacity: 1, y: 0 },
      }}
      className="group relative min-h-[155px] overflow-hidden rounded-lg border border-blue-200/15 bg-white/[0.055] p-6 text-left shadow-[0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200/35 hover:bg-white/[0.075] sm:min-h-[175px] sm:p-7"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-200/45" />
      <p className="text-4xl font-extrabold leading-none text-white sm:text-5xl">
        {displayValue}
        {stat.suffix}
      </p>
      <p className="mt-6 max-w-[12rem] text-base font-medium leading-relaxed text-blue-100/70 sm:text-lg">
        {stat.label}
      </p>
    </MotionDiv>
  );
};

const workflow = [
  {
    number: "01",
    title: "Set the direction",
    description:
      "Describe your idea or upload an image, then choose the genre, reader age, and illustration style.",
  },
  {
    number: "02",
    title: "Generate the book",
    description:
      "TaleCrafter develops the narrative, cover, and illustrated pages as one connected story.",
  },
  {
    number: "03",
    title: "Read, listen, and share",
    description:
      "Open the story as a flipbook, use page narration, or export an image-rich PDF for offline reading.",
  },
];

const capabilities = [
  {
    icon: Upload,
    title: "Prompt or image to story",
    description:
      "Begin with a written idea or let an uploaded image become the setting for something new.",
  },
  {
    icon: ImageIcon,
    title: "Illustrations built into the flow",
    description:
      "Generate a cover and scene artwork in watercolor, anime, comic, 3D, and other visual styles.",
  },
  {
    icon: Mic2,
    title: "Narration on every page",
    description:
      "Listen inside the reader with playback that moves naturally from one story page to the next.",
  },
  {
    icon: Languages,
    title: "Stories for different readers",
    description:
      "Shape language, tone, genre, and age level around the person who will actually read the book.",
  },
  {
    icon: GitBranch,
    title: "Decisions that change the plot",
    description:
      "Use Plot Twist mode to choose the next direction and keep a visible history of the path taken.",
  },
  {
    icon: Download,
    title: "A finished book you can keep",
    description:
      "Return to stories in your dashboard or export a polished PDF once the narrative is complete.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    credits: "5 credits",
    description: "Included when you create an account.",
    ctaLabel: "Start free",
    href: "/create-story",
    recommended: false,
  },
  {
    name: "Basic",
    price: "$1.99",
    credits: "10 credits",
    description: "A small refill for an occasional story.",
    ctaLabel: "Choose Basic",
    href: "/buy-credits",
    recommended: false,
  },
  {
    name: "Premium",
    price: "$3.99",
    credits: "75 credits",
    description: "The best fit for regular creation.",
    ctaLabel: "Choose Premium",
    href: "/buy-credits",
    recommended: true,
  },
  {
    name: "Ultimate",
    price: "$5.99",
    credits: "150 credits",
    description: "More room for longer creative runs.",
    ctaLabel: "Choose Ultimate",
    href: "/buy-credits",
    recommended: false,
  },
];

const faqs = [
  {
    question: "What is the difference between Classic and Plot Twist?",
    answer:
      "Classic mode creates a complete storybook in one flow. Plot Twist mode pauses at key moments so you can choose what happens next and build the story branch by branch.",
  },
  {
    question: "Can I create a story from an image?",
    answer:
      "Yes. Upload an image and TaleCrafter can use its scene, mood, and subject as the starting point for your story idea.",
  },
  {
    question: "How can I read a finished story?",
    answer:
      "Stories can be read in a book-style flip view or a scrolling story view. Page narration is available inside the reader, and completed stories can be exported as PDFs.",
  },
  {
    question: "Can I try TaleCrafter before buying credits?",
    answer:
      "Yes. New accounts start with five credits, so you can create and experience the workflow before choosing a paid credit pack.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const Hero = () => {
  return (
    <main className="overflow-hidden bg-[#020b1f] text-blue-100">
      <section className="section-spacing relative flex min-h-[100svh] w-full flex-col justify-center px-5 md:px-16 lg:px-32 xl:px-44">
        <div className="tc-hero-grid absolute inset-0 opacity-25" />

        <MotionDiv
          initial="hidden"
          animate="show"
          transition={{ duration: 0.7 }}
          variants={fadeUp}
          className="relative mx-auto max-w-4xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Illustrated stories from a single idea
          </p>

          <h1 className="tc-title-gradient mt-6 text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl lg:text-7xl">
            TaleCrafter AI
            <span className="mt-2 block text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
              Make a story worth reading together
            </span>
          </h1>

          <TextGenerateEffect
            as="p"
            words={HERO_SUBTEXT}
            className="mx-auto mt-7 max-w-3xl text-base font-medium leading-relaxed text-blue-100/75 sm:text-lg"
            duration={HERO_TEXT_DURATION}
            staggerDelay={HERO_TEXT_STAGGER}
            startDelay={HERO_TEXT_START_DELAY}
          />
        </MotionDiv>

        <div
          className="hero-actions-reveal relative mt-10 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: `${HERO_ACTION_DELAY_MS}ms` }}
        >
            <Link
              href="/create-story"
              className="tc-btn-primary inline-flex min-h-12 items-center gap-2 px-7 py-3 text-base shadow-[0_10px_30px_rgba(37,99,235,0.28)]"
            >
              Create your first story
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
        </div>
      </section>

      <section
        id="stats"
        aria-label="TaleCrafter statistics"
        className="border-y border-blue-200/10 bg-[#071328] px-6 py-20 sm:px-8 lg:px-12 lg:py-24"
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {heroStats.map((stat, index) => (
            <AnimatedStat key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </section>

      <section className="bg-[#020b1f] px-6 py-20 text-blue-100 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20">
          <MotionDiv
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={fadeUp}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              The whole book, not just the first draft
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl">
              Go from a blank page to a story people can actually read.
            </h2>
            <p className="mt-6 text-lg leading-8 text-blue-100/70">
              TaleCrafter keeps writing, illustration, narration, and reading in
              one place. Your creative choices carry through from the first prompt
              to the final page.
            </p>
            <ul className="mt-8 space-y-4 text-blue-100/80">
              {[
                "A generated cover and illustrated story pages",
                "Age, genre, language, and art direction controls",
                "A dashboard for continuing and revisiting your work",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/create-story"
              className="mt-9 inline-flex items-center gap-2 font-semibold text-cyan-200 transition hover:text-white"
            >
              Start with your idea
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </MotionDiv>

          <MotionDiv
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-lg border border-blue-200/20 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
          >
            <Image
              src="/demo.png"
              alt="TaleCrafter reader showing two illustrated story pages"
              width={817}
              height={754}
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="h-auto w-full"
              priority
            />
          </MotionDiv>
        </div>
      </section>

      <section className="border-y border-blue-200/10 bg-[#071328] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              One idea, two ways to tell it
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
              Choose the kind of story experience you want.
            </h2>
          </div>

          <div className="mt-14 grid border-y border-blue-200/15 lg:grid-cols-2 lg:divide-x lg:divide-blue-200/15">
            <MotionDiv
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              className="border-b border-blue-200/15 py-10 lg:border-b-0 lg:pr-14"
            >
              <BookOpen className="h-7 w-7 text-cyan-300" aria-hidden="true" />
              <h3 className="mt-6 text-2xl font-bold text-white">Classic Story</h3>
              <p className="mt-4 max-w-xl text-lg leading-8 text-blue-100/70">
                Create a complete beginning-to-end storybook in one generation.
                It is the direct route when you already know the kind of book you
                want to make.
              </p>
              <p className="mt-6 text-sm font-semibold text-blue-100/90">
                Best for: bedtime stories, classroom reading, gifts, and quick drafts.
              </p>
            </MotionDiv>

            <MotionDiv
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ delay: 0.08 }}
              className="py-10 lg:pl-14"
            >
              <GitBranch className="h-7 w-7 text-rose-300" aria-hidden="true" />
              <h3 className="mt-6 text-2xl font-bold text-white">Plot Twist Story</h3>
              <p className="mt-4 max-w-xl text-lg leading-8 text-blue-100/70">
                Make a choice at each turning point and let the selected path shape
                the next illustrated chapter. Your decisions remain visible as the
                story grows toward its ending.
              </p>
              <p className="mt-6 text-sm font-semibold text-blue-100/90">
                Best for: shared reading, creative play, and choose-your-path adventures.
              </p>
            </MotionDiv>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#071328] px-6 py-20 text-blue-100 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
              A short path from idea to finished book.
            </h2>
          </div>

          <div className="mt-14 grid border-y border-blue-200/15 md:grid-cols-3 md:divide-x md:divide-blue-200/15">
            {workflow.map((step, index) => (
              <MotionDiv
                key={step.number}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="border-b border-blue-200/15 py-9 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0"
              >
                <span className="text-sm font-bold text-cyan-300">{step.number}</span>
                <h3 className="mt-5 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 leading-7 text-blue-100/70">{step.description}</p>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#020b1f] px-6 py-20 text-blue-100 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.65fr_1.35fr] lg:gap-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Everything stays connected
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              The useful details are part of the product, not add-ons.
            </h2>
            <p className="mt-5 leading-7 text-blue-100/70">
              Each feature supports the same outcome: a story that feels complete
              enough to read, revisit, and share.
            </p>
          </div>

          <div className="divide-y divide-blue-200/15 border-y border-blue-200/15">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="grid gap-4 py-7 sm:grid-cols-[2rem_14rem_1fr] sm:gap-6">
                  <Icon className="h-6 w-6 text-cyan-300" aria-hidden="true" />
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="leading-7 text-blue-100/70">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 bg-[#071328] px-6 py-20 text-blue-100 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Simple credit packs
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
              Start free. Add credits when you need them.
            </h2>
            <p className="mt-5 text-lg leading-8 text-blue-100/70">
              No complicated tiers. Choose the amount that matches how often you create.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`flex min-h-[300px] flex-col rounded-lg border p-7 ${
                  plan.recommended
                    ? "border-blue-200/60 bg-blue-600/20 text-white"
                    : "border-blue-200/15 bg-white/[0.04] text-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.recommended && (
                    <span className="rounded border border-white/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-100">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-5 text-4xl font-extrabold">{plan.price}</p>
                <p className="mt-2 font-semibold text-cyan-200">
                  {plan.credits}
                </p>
                <p className="mt-5 leading-7 text-blue-100/70">
                  {plan.description}
                </p>
                <Link
                  href={plan.href}
                  className={`mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition ${
                    plan.recommended
                      ? "bg-white text-[#172033] hover:bg-blue-50"
                      : "border border-blue-200/25 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {plan.ctaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-blue-200/10 bg-[#020b1f] px-6 py-20 text-blue-100 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.65fr_1.35fr] lg:gap-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Before you begin
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              A few useful answers.
            </h2>
          </div>
          <div className="divide-y divide-blue-200/15 border-y border-blue-200/15">
            {faqs.map((item) => (
              <div key={item.question} className="grid gap-3 py-7 sm:grid-cols-[0.85fr_1.15fr] sm:gap-10">
                <h3 className="font-bold text-white">{item.question}</h3>
                <p className="leading-7 text-blue-100/70">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0b172b] px-6 py-20 text-center sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-white sm:text-5xl">
            Your next story can start with one sentence.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100/70">
            Bring the idea. TaleCrafter will help you turn it into an illustrated
            book you can read, shape, and share.
          </p>
          <Link
            href="/create-story"
            className="tc-btn-primary mt-8 inline-flex min-h-12 items-center gap-2 px-7 py-3 text-base"
          >
            Create your first story
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Hero;
