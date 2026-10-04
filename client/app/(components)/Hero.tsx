"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  GitBranch,
  ImageIcon,
  Languages,
  Mic2,
  Upload,
} from "lucide-react";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import ScrollStorySequence from "./ScrollStorySequence";
import StoryDemoFrame from "./StoryDemoFrame";
import styles from "./home-theme.module.css";

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

const supportedGenres = [
  "Mythology",
  "Science Fiction",
  "Educational",
  "History",
  "Fantasy",
  "Crime & Mystery",
  "Motivational",
  "Horror",
  "Romance",
];

const supportedArtStyles = [
  "Watercolor",
  "Anime",
  "3D Cartoon",
  "Oil Paint",
  "Paper Cut",
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
    features: ["Five starter credits", "Classic and Plot Twist modes", "No payment required"],
    ctaLabel: "Start free",
    href: "/create-story",
    recommended: false,
  },
  {
    name: "Basic",
    price: "$199",
    credits: "10 credits",
    description: "A small refill for an occasional story.",
    features: ["Ten story credits", "Use across every story mode", "Secure one-time payment"],
    ctaLabel: "Choose Basic",
    href: "/buy-credits",
    recommended: false,
  },
  {
    name: "Premium",
    price: "$399",
    credits: "75 credits",
    description: "The best fit for regular creation.",
    features: ["Seventy-five story credits", "Use across every story mode", "Secure one-time payment"],
    ctaLabel: "Choose Premium",
    href: "/buy-credits",
    recommended: true,
  },
  {
    name: "Ultimate",
    price: "$599",
    credits: "150 credits",
    description: "More room for longer creative runs.",
    features: ["One hundred fifty credits", "Use across every story mode", "Secure one-time payment"],
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
  const prefersReducedMotion = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className={`${styles.home} overflow-clip bg-[#0b1522] text-[#c3cbd4]`}>
      <section className={`${styles.hero} section-spacing relative flex min-h-[100svh] w-full flex-col justify-center px-5 md:px-16 lg:px-32 xl:px-44`}>
        <div aria-hidden="true" className={styles.heroLight} />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 xl:gap-14">
          <div className="relative z-20 text-center lg:text-left">
            <MotionDiv
              initial="hidden"
              animate="show"
              transition={{ duration: 0.7 }}
              variants={fadeUp}
              className="relative"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
                Illustrated stories from a single idea
              </p>

              <h1 className="mt-6 text-4xl font-medium leading-tight tracking-tight text-[#f1eadb] sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-7xl">
                TaleCrafter AI
                <span className="mt-5 block text-3xl sm:text-4xl md:text-5xl lg:text-[3.15rem] xl:text-6xl">
                  Make a story worth reading together
                </span>
              </h1>

              <TextGenerateEffect
                as="p"
                words={HERO_SUBTEXT}
                className="mx-auto mt-7 max-w-2xl text-base font-medium leading-relaxed text-[#c3cbd4]/75 sm:text-lg lg:mx-0"
                duration={HERO_TEXT_DURATION}
                staggerDelay={HERO_TEXT_STAGGER}
                startDelay={HERO_TEXT_START_DELAY}
              />
            </MotionDiv>

            <div
              className="hero-actions-reveal relative mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
              style={{ animationDelay: `${HERO_ACTION_DELAY_MS}ms` }}
            >
              <Link
                href="/create-story"
                className={`${styles.primary} inline-flex min-h-12 items-center gap-2 px-7 py-3 text-base`}
              >
                Create your first story
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <MotionDiv
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, x: 32, scale: 0.97 }
            }
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.85,
              delay: 0.18,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-30 ml-auto flex min-h-[290px] w-full max-w-[940px] items-center justify-end sm:min-h-[390px] lg:min-h-[620px]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-[2%] rounded-full bg-[#d8c69e]/20 blur-[90px]"
            />
            <Image
              src="/heroimage-talecrafter.png"
              alt="An enchanted illustrated storybook opening into a miniature fantasy world"
              width={1678}
              height={937}
              sizes="(max-width: 1023px) 110vw, 64vw"
              className="pointer-events-none relative z-40 h-auto w-[112%] max-w-none select-none sm:w-[120%] lg:w-[135%]"
              unoptimized
              priority
            />
          </MotionDiv>
        </div>
      </section>

      <ScrollStorySequence />

      <section className="bg-[#0b1522] px-6 py-20 text-[#c3cbd4] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20">
          <MotionDiv
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={fadeUp}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
              The whole book, not just the first draft
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-[#f1eadb] sm:text-5xl">
              Go from a blank page to a story people can actually read.
            </h2>
            <p className="mt-6 text-lg leading-8 text-[#c3cbd4]/70">
              TaleCrafter keeps writing, illustration, narration, and reading in
              one place. Your creative choices carry through from the first prompt
              to the final page.
            </p>
            <ul className="mt-8 space-y-4 text-[#c3cbd4]/80">
              {[
                "A generated cover and illustrated story pages",
                "Age, genre, language, and art direction controls",
                "A dashboard for continuing and revisiting your work",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#d8c69e]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/create-story"
              className="mt-9 inline-flex items-center gap-2 font-semibold text-[#d8c69e] transition hover:text-[#f1eadb]"
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
          >
            <StoryDemoFrame
              alt="TaleCrafter reader showing two illustrated story pages"
              sizes="(max-width: 1024px) 100vw, 58vw"
              priority
            />
          </MotionDiv>
        </div>
      </section>

      <section className="border-y border-[#d8c69e]/10 bg-[#0b1522] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
              One idea, two ways to tell it
            </p>
            <h2 className="mt-4 text-3xl font-bold text-[#f1eadb] sm:text-5xl">
              Choose the kind of story experience you want.
            </h2>
          </div>

          <div className="mt-14 grid border-y border-[#d8c69e]/15 lg:grid-cols-2 lg:divide-x lg:divide-[#d8c69e]/15">
            <MotionDiv
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              className="border-b border-[#d8c69e]/15 py-10 lg:border-b-0 lg:pr-14"
            >
              <BookOpen className="h-7 w-7 text-[#d8c69e]" aria-hidden="true" />
              <h3 className="mt-6 text-2xl font-bold text-[#f1eadb]">Classic Story</h3>
              <p className="mt-4 max-w-xl text-lg leading-8 text-[#c3cbd4]/70">
                Create a complete beginning-to-end storybook in one generation.
                It is the direct route when you already know the kind of book you
                want to make.
              </p>
              <p className="mt-6 text-sm font-semibold text-[#c3cbd4]/90">
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
              <GitBranch className="h-7 w-7 text-[#d8c69e]" aria-hidden="true" />
              <h3 className="mt-6 text-2xl font-bold text-[#f1eadb]">Plot Twist Story</h3>
              <p className="mt-4 max-w-xl text-lg leading-8 text-[#c3cbd4]/70">
                Make a choice at each turning point and let the selected path shape
                the next illustrated chapter. Your decisions remain visible as the
                story grows toward its ending.
              </p>
              <p className="mt-6 text-sm font-semibold text-[#c3cbd4]/90">
                Best for: shared reading, creative play, and choose-your-path adventures.
              </p>
            </MotionDiv>
          </div>

          <div className="grid gap-12 border-b border-[#d8c69e]/15 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:py-28">
            <MotionDiv
              initial={prefersReducedMotion ? { opacity: 0 } : "hidden"}
              whileInView={prefersReducedMotion ? { opacity: 1 } : "show"}
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
                Stories for every imagination
              </p>
              <h2 className="mt-4 max-w-xl text-3xl font-bold leading-tight text-[#f1eadb] sm:text-5xl">
                Find the genre that fits the world you want to create.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#c3cbd4]/75">
                From ancient legends and distant galaxies to tender romances and
                unsettling mysteries, TaleCrafter supports nine distinct genres.
                Choose one to guide the story&apos;s atmosphere, pacing, and creative
                direction from the opening page.
              </p>

              <ul className="mt-9 flex max-w-2xl flex-wrap gap-3" aria-label="Supported story genres">
                {supportedGenres.map((genre) => (
                  <li
                    key={genre}
                    className="rounded-full border border-[#d8c69e]/25 bg-[#d8c69e]/[0.06] px-4 py-2 text-sm font-medium text-[#e4dccb]"
                  >
                    {genre}
                  </li>
                ))}
              </ul>

              <Link
                href="/create-story"
                className="mt-10 inline-flex items-center gap-2 font-semibold text-[#d8c69e] transition hover:text-[#f1eadb]"
              >
                Choose your genre
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </MotionDiv>

            <MotionDiv
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#d8c69e]/20 bg-[#111d2b] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.4)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.55rem]">
                <video
                  className="h-full w-full object-cover"
                  autoPlay={!prefersReducedMotion}
                  muted
                  loop={!prefersReducedMotion}
                  playsInline
                  preload="metadata"
                  poster="/genre/fantasy.webp"
                  aria-label="A cinematic TaleCrafter storybook animation"
                >
                  <source src="/videos/animo-cover-ring-vertical-1350p.mp4" type="video/mp4" />
                </video>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1522]/45 via-transparent to-[#d8c69e]/[0.05]"
                />
              </div>
            </MotionDiv>
          </div>

          <section
            aria-labelledby="art-styles-heading"
            className="grid gap-12 border-b border-[#d8c69e]/15 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20 lg:py-28"
          >
            <MotionDiv
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#d8c69e]/20 bg-[#111d2b] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.4)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.55rem]">
                <video
                  className="h-full w-full object-cover"
                  autoPlay={!prefersReducedMotion}
                  muted
                  loop={!prefersReducedMotion}
                  playsInline
                  preload="metadata"
                  poster="/art-style/paper-cut.webp"
                  aria-label="A cinematic preview of TaleCrafter illustration styles"
                >
                  <source src="/videos/art-style-showcase.mp4" type="video/mp4" />
                </video>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1522]/45 via-transparent to-[#d8c69e]/[0.05]"
                />
              </div>
            </MotionDiv>

            <MotionDiv
              initial={prefersReducedMotion ? { opacity: 0 } : "hidden"}
              whileInView={prefersReducedMotion ? { opacity: 1 } : "show"}
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
                Your story, your visual language
              </p>
              <h2
                id="art-styles-heading"
                className="mt-4 max-w-xl text-3xl font-bold leading-tight text-[#f1eadb] sm:text-5xl"
              >
                Give every page an art direction of its own.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#c3cbd4]/75">
                Choose how your story should feel before the first illustration is
                created. Each style reshapes the same idea through its own texture,
                depth, linework, and atmosphere while keeping the book visually
                consistent from cover to final page.
              </p>

              <ul className="mt-9 flex max-w-2xl flex-wrap gap-3" aria-label="Supported illustration styles">
                {supportedArtStyles.map((style) => (
                  <li
                    key={style}
                    className="rounded-full border border-[#d8c69e]/25 bg-[#d8c69e]/[0.06] px-4 py-2 text-sm font-medium text-[#e4dccb]"
                  >
                    {style}
                  </li>
                ))}
              </ul>

              <Link
                href="/create-story"
                className="mt-10 inline-flex items-center gap-2 font-semibold text-[#d8c69e] transition hover:text-[#f1eadb]"
              >
                Explore art styles
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </MotionDiv>
          </section>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#0b1522] px-6 py-20 text-[#c3cbd4] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-bold text-[#f1eadb] sm:text-5xl">
              A short path from idea to finished book.
            </h2>
          </div>

          <div className="mt-14 grid border-y border-[#d8c69e]/15 md:grid-cols-3 md:divide-x md:divide-[#d8c69e]/15">
            {workflow.map((step, index) => (
              <MotionDiv
                key={step.number}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="border-b border-[#d8c69e]/15 py-9 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0"
              >
                <span className="text-sm font-bold text-[#d8c69e]">{step.number}</span>
                <h3 className="mt-5 text-xl font-bold text-[#f1eadb]">{step.title}</h3>
                <p className="mt-3 leading-7 text-[#c3cbd4]/70">{step.description}</p>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0b1522] px-6 py-20 text-[#c3cbd4] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.65fr_1.35fr] lg:gap-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
              Everything stays connected
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-[#f1eadb] sm:text-4xl">
              The useful details are part of the product, not add-ons.
            </h2>
            <p className="mt-5 leading-7 text-[#c3cbd4]/70">
              Each feature supports the same outcome: a story that feels complete
              enough to read, revisit, and share.
            </p>
          </div>

          <div className="divide-y divide-[#d8c69e]/15 border-y border-[#d8c69e]/15">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="grid gap-4 py-7 sm:grid-cols-[2rem_14rem_1fr] sm:gap-6">
                  <Icon className="h-6 w-6 text-[#d8c69e]" aria-hidden="true" />
                  <h3 className="font-bold text-[#f1eadb]">{item.title}</h3>
                  <p className="leading-7 text-[#c3cbd4]/70">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 bg-[#0b1522] px-6 py-20 text-[#c3cbd4] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
              Simple credit packs
            </p>
            <h2 className="mt-4 text-3xl font-bold text-[#f1eadb] sm:text-5xl">
              Start free. Add credits when you need them.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#c3cbd4]/70">
              No complicated tiers. Choose the amount that matches how often you create.
            </p>
          </div>

          <div className="mt-14 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`flex min-h-[430px] flex-col rounded-[1.75rem] border p-7 shadow-[0_24px_70px_rgba(0,0,0,0.18)] ${
                  plan.recommended
                    ? "border-[#d8c69e]/60 bg-[#d8c69e]/10 text-[#f1eadb]"
                    : "border-[#d8c69e]/15 bg-white/[0.04] text-[#f1eadb]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.recommended && (
                    <span className="rounded border border-white/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#c3cbd4]">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-5 text-4xl font-extrabold">{plan.price}</p>
                <p className="mt-2 font-semibold text-[#d8c69e]">
                  {plan.credits}
                </p>
                <p className="mt-5 leading-7 text-[#c3cbd4]/70">
                  {plan.description}
                </p>
                <ul className="mt-7 space-y-3 border-t border-[#d8c69e]/15 pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-[#c3cbd4]/80">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#d8c69e]" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Link
                    href={plan.href}
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 font-semibold transition ${
                      plan.recommended
                        ? "bg-[#d8c69e] text-[#101a28] hover:bg-[#eee0c0]"
                        : "border border-[#d8c69e]/25 bg-white/10 text-[#f1eadb] hover:bg-white/15"
                    }`}
                  >
                    {plan.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#d8c69e]/10 bg-[#0b1522] px-6 py-20 text-[#c3cbd4] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d8c69e]">
              Frequently asked questions
            </p>
            <h2 className="mt-4 font-serif text-3xl font-medium text-[#f1eadb] sm:text-5xl">
              Everything you need to know.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#c3cbd4]/70">
              Quick answers about creating, reading, and sharing your stories.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-[1.75rem] border border-[#d8c69e]/15 bg-[#111d2b]/65 px-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:px-8">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              const answerId = `faq-answer-${index}`;

              return (
                <MotionDiv
                  layout={!prefersReducedMotion}
                  key={item.question}
                  className="border-b border-[#d8c69e]/15 last:border-b-0"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-6 py-7 text-left"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span className="text-base font-semibold text-[#f1eadb] sm:text-lg">
                      {item.question}
                    </span>
                    <MotionDiv
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22 }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d8c69e]/25 bg-[#d8c69e]/[0.06] text-[#d8c69e]"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </MotionDiv>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <MotionDiv
                        id={answerId}
                        key="answer"
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        className="max-w-3xl pb-7 pr-12"
                      >
                        <p className="leading-7 text-[#c3cbd4]/70">{item.answer}</p>
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </MotionDiv>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`${styles.closing} px-6 py-20 text-center sm:px-8 lg:px-12 lg:py-24`}>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#f1eadb] sm:text-5xl">
            Your next story can start with one sentence.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#c3cbd4]/70">
            Bring the idea. TaleCrafter will help you turn it into an illustrated
            book you can read, shape, and share.
          </p>
          <Link
            href="/create-story"
            className={`${styles.primary} mt-8 inline-flex min-h-12 items-center gap-2 px-7 py-3 text-base`}
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
