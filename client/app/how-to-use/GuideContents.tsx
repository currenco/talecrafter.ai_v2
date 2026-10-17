"use client";

import { useEffect, useState } from "react";
import { guideSections } from "@/lib/guides/how-to-use";

export default function GuideContents() {
  const [activeId, setActiveId] = useState<string>(guideSections[0].id);

  useEffect(() => {
    const sections = guideSections.flatMap(({ id }) => {
      const element = document.getElementById(id);
      return element ? [element] : [];
    });
    let frame = 0;

    const updateActiveSection = () => {
      frame = 0;
      // Follow the section at the reading line below the sticky header.
      const readingLine = Math.min(160, window.innerHeight * 0.25);
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top > readingLine) break;
        current = section;
      }
      if (current) setActiveId(current.id);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    const observer = new ResizeObserver(scheduleUpdate);
    sections.forEach(section => observer.observe(section));

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      observer.disconnect();
    };
  }, []);

  return <nav aria-label="Guide contents" className="border-t border-white/15 pt-4 lg:sticky lg:top-24">
    <p className="mb-2 text-sm font-semibold text-[#f1eadb]">In this guide</p>
    <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
      {guideSections.map(section => <li key={section.id}>
        <a
          href={`#${section.id}`}
          aria-current={activeId === section.id ? "location" : undefined}
          className={`block rounded border-l-2 px-2 py-2 text-sm font-medium leading-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d8c69e] ${activeId === section.id ? "border-[#d8c69e] bg-[#d8c69e]/10 text-[#d8c69e]" : "border-transparent hover:bg-white/5 hover:text-white"}`}
        >{section.label}</a>
      </li>)}
    </ul>
  </nav>;
}
