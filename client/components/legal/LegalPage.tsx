import Link from "next/link";
import { legalEffectiveDate, type LegalDocument } from "@/lib/legal/policies";

export default function LegalPage({ document }: { document: LegalDocument }) {
  return <main className="min-h-screen bg-[#0b1522] px-4 py-6 text-[#c3cbd4] sm:px-6 sm:py-10">
    <article className="mx-auto max-w-3xl [letter-spacing:0]">
      <header className="border-b border-white/15 pb-6">
        <p className="text-xs font-semibold uppercase text-[#d8c69e]">TaleCrafter AI</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#f1eadb] sm:text-3xl">{document.title}</h1>
        <p className="mt-3 text-sm leading-6">{document.description}</p>
        <p className="mt-3 text-xs text-[#c3cbd4]/75">Effective date: <time dateTime={legalEffectiveDate}>{new Date(`${legalEffectiveDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time></p>
      </header>
      {document.sections.map((section, index) => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-28 border-b border-white/10 py-6 sm:py-8">
        <h2 id={`${section.id}-title`} className="text-lg font-semibold leading-snug text-[#f1eadb] sm:text-xl">{index + 1}. {section.title}</h2>
        {section.paragraphs.map(paragraph => <p key={paragraph} className="mt-3 text-sm leading-7 sm:text-base sm:leading-7">{paragraph}</p>)}
        {section.links && <ul className="mt-3 space-y-2">
          {section.links.map(link => <li key={link.href}><a href={link.href} className="inline-block break-words py-1 text-sm text-[#d8c69e] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{link.label}</a></li>)}
        </ul>}
      </section>)}
      <nav aria-label="Related policies" className="flex flex-wrap gap-x-6 gap-y-2 pt-6 text-sm">
        <Link href="/privacy-policy" className="py-2 text-[#d8c69e] hover:underline">Privacy Policy</Link>
        <Link href="/terms-and-conditions" className="py-2 text-[#d8c69e] hover:underline">Terms &amp; Conditions</Link>
        <Link href="/how-to-use" className="py-2 text-[#d8c69e] hover:underline">How to Use</Link>
      </nav>
    </article>
  </main>;
}
