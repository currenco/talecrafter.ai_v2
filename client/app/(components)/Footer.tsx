import Image from "next/image";
import Link from "next/link";
import { legalContactEmail } from "@/lib/legal/policies";

const Footer = () => {
  const year = new Date().getFullYear();

  const companyLinks = [
    { label: "About", href: "/about" },
    { label: "How to Use", href: "/how-to-use" },
    { label: "Create Story", href: "/create-story" },
    { label: "Explore Stories", href: "/explore" },
  ];

  const footerLinkClass =
    "text-sm text-[#c3cbd4]/50 transition-colors duration-200 hover:text-[#f1eadb]";

  return (
    <footer className="border-t border-[#d8c69e]/15 bg-[#0b1522] text-[#c3cbd4]/80">
      <div className="mx-auto w-full max-w-screen-xl px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] lg:gap-16">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3 font-serif text-2xl font-medium tracking-normal text-[#f1eadb] sm:text-3xl">
              <Image src="/talecrafter-symbol.png" alt="" width={36} height={36} className="shrink-0 object-contain" />
              <span>TaleCrafter AI</span>
            </Link>
            <p className="mt-6 text-sm leading-7 text-[#c3cbd4]/50">
              AI storybook creator for building illustrated stories, interactive paths,
              narration-ready pages, and polished reading experiences.
            </p>
          </div>

          <nav aria-label="Company links">
            <h2 className="text-base font-bold text-[#f1eadb]">Company</h2>
            <ul className="mt-6 space-y-4">
              {companyLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Contact and legal links">
            <h2 className="text-base font-bold text-[#f1eadb]">Contact &amp; Legal</h2>
            <ul className="mt-6 space-y-4">
              <li><a href={`mailto:${legalContactEmail}`} className={footerLinkClass}>Contact us</a></li>
              <li><Link href="/privacy-policy" className={footerLinkClass}>Privacy Policy</Link></li>
              <li><Link href="/terms-and-conditions" className={footerLinkClass}>Terms &amp; Conditions</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-[#d8c69e]/15 pt-8 text-center md:mt-16">
          <p className="text-sm text-[#c3cbd4]/50">
            &copy; {year} TaleCrafter AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
