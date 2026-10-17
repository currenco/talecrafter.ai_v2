import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, HelpCircle, Sparkles } from "lucide-react";
import { publicPageMetadata } from "@/lib/seo/metadata";
import { classicSteps, guideFaqs, plotTwistSteps, subscriptionSteps } from "@/lib/guides/how-to-use";
import GuideContents from "./GuideContents";
import { legalContactEmail } from "@/lib/legal/policies";

export const metadata = publicPageMetadata("/how-to-use");

const sectionClass = "scroll-mt-28 border-t border-white/15 py-7 sm:py-9";
const headingClass = "text-xl font-semibold leading-snug tracking-normal text-[#f1eadb] sm:text-2xl";
const linkClass = "font-medium text-[#d8c69e] underline decoration-[#d8c69e]/40 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";

function Steps({ items }: { items: { title: string; text: string }[] }) {
  return <ol className="mt-5 space-y-5">
    {items.map((step, index) => <li key={step.title} className="flex gap-3 sm:gap-4">
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d8c69e]/30 text-xs font-semibold text-[#d8c69e]">{index + 1}</span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-[#f1eadb]">{step.title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#c3cbd4] sm:text-base sm:leading-7">{step.text}</p>
      </div>
    </li>)}
  </ol>;
}

export default function HowToUsePage() {
  return <main className="min-h-screen bg-[#0b1522] px-4 pb-12 pt-5 text-[#c3cbd4] sm:px-6 sm:pt-8 lg:px-10">
    <div className="mx-auto max-w-6xl">
      <header className="pb-7 sm:pb-9">
        <p className="text-xs font-semibold uppercase tracking-normal text-[#d8c69e]">TaleCrafter AI guide</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-[#f1eadb] sm:text-3xl lg:text-4xl">How to use TaleCrafter AI</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">From your first idea to a finished illustrated story. Find the steps for Free trial and Creator, pick up a draft, and manage your subscription.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/create-story" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#d8c69e] px-4 py-2 text-sm font-semibold text-[#101a28] hover:bg-[#eee0c0]">Create Story <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link href="/pricing" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/25 px-4 py-2 text-sm font-semibold text-[#f1eadb] hover:bg-white/5"><Sparkles size={16} aria-hidden="true" />View plans</Link>
        </div>
      </header>

      <div className="grid items-start gap-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <GuideContents />

        <div className="min-w-0">
          <section id="getting-started" className={sectionClass} aria-labelledby="getting-started-heading">
            <h2 id="getting-started-heading" className={headingClass}>1. Set up your account</h2>
            <p className="mt-3 text-sm leading-6 sm:text-base sm:leading-7"><Link className={linkClass} href="/sign-up">Create an account</Link> or <Link className={linkClass} href="/sign-in">sign in</Link>. Google and GitHub are available on both plans. Your plan determines how you create and which account funds the images.</p>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="border-l-2 border-[#d8c69e]/50 pl-4"><dt className="font-semibold text-[#f1eadb]">Free trial</dt><dd className="mt-2 text-sm leading-6">Create Classic stories with a linked GitHub account and your own funded Pollinations key. Image generation uses your Pollinations balance and depends on a valid key and provider availability. Pollinations limits still apply; TaleCrafter does not impose monthly generation quotas on the Free trial.</dd></div>
              <div className="border-l-2 border-emerald-300/50 pl-4"><dt className="font-semibold text-[#f1eadb]">Creator</dt><dd className="mt-2 text-sm leading-6">Create Classic and Plot Twist stories with Google or GitHub. Images use TaleCrafter&apos;s generation account subject to provider availability and shared platform capacity. Creator also includes the story pack and PDF export.</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-6">Check <Link className={linkClass} href="/pricing">Plans</Link> for current prices and subscription details. Free trial images depend on your Pollinations key and balance.</p>
          </section>

          <section id="classic" className={sectionClass} aria-labelledby="classic-heading">
            <h2 id="classic-heading" className={headingClass}>2. Create a Classic story</h2>
            <Steps items={classicSteps} />
            <blockquote className="ml-10 mt-5 border-l-2 border-[#d8c69e]/40 pl-4 text-sm leading-6">
              <p className="mb-1 font-semibold text-[#f1eadb]">Example idea</p>
              <p>A young inventor with round glasses and a green coat discovers a clockwork city. She must repair its central clock before sunrise. Make the adventure hopeful, with a friendship at its heart.</p>
            </blockquote>
            <div className="ml-10 mt-5 flex flex-wrap gap-5">
              {[{ src: "/art-style/watercolor.webp", label: "Watercolor" }, { src: "/art-style/paper-cut.webp", label: "Paper cut" }].map(style => <figure key={style.src} className="w-28">
                <Image src={style.src} alt={`${style.label} illustration style preview from Create Story`} width={112} height={112} className="aspect-square rounded-md object-cover" />
                <figcaption className="mt-2 text-xs">{style.label}</figcaption>
              </figure>)}
            </div>
          </section>

          <section id="image-ideas" className={sectionClass} aria-labelledby="image-ideas-heading">
            <h2 id="image-ideas-heading" className={headingClass}>3. Start from an image instead</h2>
            <Steps items={[
              { title: "Choose an image", text: "On Create Story, use the image upload section to choose a picture. Only upload images you have permission to use." },
              { title: "Generate and review the idea", text: "Choose Generate Idea and read the suggested story idea. This creates an idea, not a finished book. If you type your own description in Begin with an idea, that text takes priority over the image-generated suggestion." },
              { title: "Continue with your story", text: "Select a genre and art style, then choose Classic Story or, with Creator, Plot Twist." },
            ]} />
          </section>

          <section id="plot-twist" className={sectionClass} aria-labelledby="plot-twist-heading">
            <h2 id="plot-twist-heading" className={headingClass}>4. Build a Plot Twist story <span className="ml-2 text-xs font-medium text-emerald-300">Creator</span></h2>
            <Steps items={plotTwistSteps} />
          </section>

          <section id="drafts" className={sectionClass} aria-labelledby="drafts-heading">
            <h2 id="drafts-heading" className={headingClass}>5. Resume an unfinished story</h2>
            <p className="mt-3 text-sm leading-6 sm:text-base sm:leading-7">Open <Link href="/dashboard" className={linkClass}>My Stories</Link>. Draft stories appear above your published library.</p>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 sm:text-base sm:leading-7">
              <li><strong className="text-[#f1eadb]">Classic draft:</strong> choose Resume to continue image generation. Resolve balance, permission, or service availability errors first.</li>
              <li><strong className="text-[#f1eadb]">Plot Twist draft:</strong> choose Continue to return to the interactive reader and your selected path.</li>
              <li>Check the existing draft before creating another story with the same idea. Starting again creates a separate project and can trigger additional generation requests.</li>
            </ul>
          </section>

          <section id="read-and-export" className={sectionClass} aria-labelledby="read-heading">
            <h2 id="read-heading" className={headingClass}>6. Read, share and export</h2>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 sm:text-base sm:leading-7">
              <li>Open a published story from your library and use the arrow controls to turn pages. Narration controls are available on the story pages where supported by your browser.</li>
              <li>Choose Share Story to share its public link. A reader arriving from a shared link or Google can open that story without signing in.</li>
              <li>Guests can preview eight stories in Explore. Continuing through related-story links asks them to sign in.</li>
              <li>With Creator, choose Download PDF on the story page. Keep the page open while the file is prepared.</li>
              <li>Under Character bible and scene prompts, choose Open story pack to view saved characters and scenes. Older stories may not contain all of this data.</li>
            </ul>
            <Link href="/explore" className={`${linkClass} mt-5 inline-flex min-h-11 items-center gap-2 text-sm`}><BookOpen size={16} aria-hidden="true" />Explore public stories</Link>
          </section>

          <section id="subscriptions" className={sectionClass} aria-labelledby="subscriptions-heading">
            <h2 id="subscriptions-heading" className={headingClass}>7. Manage your Creator subscription</h2>
            <p className="mt-3 text-sm leading-6 sm:text-base sm:leading-7">Creator renews automatically each month while the subscription is active, subject to successful payment. You can manage renewal from <Link href="/pricing" className={linkClass}>Plans</Link>.</p>
            <Steps items={subscriptionSteps} />
            <p className="mt-5 text-sm leading-6">Creator access follows the paid billing period. Provider outages or shared platform capacity can interrupt generation. Check your drafts rather than repeatedly starting new projects.</p>
          </section>

          <section id="help" className={sectionClass} aria-labelledby="help-heading">
            <h2 id="help-heading" className={headingClass}>Troubleshooting</h2>
            <div className="mt-4 divide-y divide-white/15">
              {guideFaqs.map(item => <details key={item.question} className="py-4">
                <summary className="cursor-pointer text-sm font-semibold leading-6 text-[#f1eadb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d8c69e] sm:text-base">{item.question}</summary>
                <p className="mt-3 text-sm leading-6">{item.answer}</p>
              </details>)}
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm leading-6"><HelpCircle size={18} className="mt-1 shrink-0 text-[#d8c69e]" aria-hidden="true" /><span>Still stuck? Contact <a className={`${linkClass} break-all`} href={`mailto:${legalContactEmail}`}>{legalContactEmail}</a> with the error message and the steps that led to it.</span></p>
          </section>
        </div>
      </div>
    </div>
  </main>;
}
