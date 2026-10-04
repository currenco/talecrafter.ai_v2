import Link from "next/link";

const Footer = () => {
  const year = new Date().getFullYear();

  const companyLinks = [
    { label: "About", href: "/about" },
    { label: "Create Story", href: "/create-story" },
    { label: "Explore Stories", href: "/explore" },
  ];

  const connectLinks = [
    { label: "contact@talecrafterai.tech", href: "mailto:contact@talecrafterai.tech" },
    { label: "Create with TaleCrafter", href: "/create-story" },
  ];

  const footerLinkClass =
    "text-sm text-[#c3cbd4]/50 transition-colors duration-200 hover:text-[#f1eadb]";

  return (
    <footer className="border-t border-[#d8c69e]/15 bg-[#0b1522] text-[#c3cbd4]/80">
      <div className="mx-auto w-full max-w-screen-xl px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] lg:gap-16">
          <div className="max-w-sm">
            <Link href="/" className="font-serif text-3xl font-medium tracking-tight text-[#f1eadb]">
              TaleCrafter AI
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

          <nav aria-label="Connect links">
            <h2 className="text-base font-bold text-[#f1eadb]">Connect</h2>
            <ul className="mt-6 space-y-4">
              {connectLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-[#d8c69e]/15 pt-8 md:mt-16">
          <p className="text-sm text-[#c3cbd4]/50">
            &copy; {year} TaleCrafter AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
