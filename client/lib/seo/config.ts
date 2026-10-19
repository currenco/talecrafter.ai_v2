import { privacyPolicy, termsAndConditions } from "@/lib/legal/policies";

export const SITE_URL = "https://www.talecrafterai.com";
export const SITE_NAME = "TaleCrafter AI";
export const SITE_DESCRIPTION =
  "Create narration-led illustrated stories with TaleCrafter AI. Turn ideas into prose stories, read or listen in your browser, and export PDFs with Creator.";
export const SITE_IMAGE = `${SITE_URL}/talecrafter-symbol.png`;

export const PUBLIC_PAGES = [
  { path: privacyPolicy.path, title: privacyPolicy.title, description: privacyPolicy.description },
  { path: termsAndConditions.path, title: termsAndConditions.title, description: termsAndConditions.description },
  { path: "/how-to-use", title: "How to Use TaleCrafter AI: Stories and Subscriptions", description: "Learn how to create illustrated stories, connect your Pollinations key, resume drafts, export PDFs, and manage your TaleCrafter AI Creator subscription." },
  { path: "/", title: "Narration-Led AI Story Generator", description: SITE_DESCRIPTION },
  { path: "/about", title: "About Our Narration-Led Story Creator", description: "Discover TaleCrafter AI: illustrated prose stories, browser-based read-aloud, character development, and interactive storytelling, not screenplay formatting." },
  { path: "/pricing", title: "Free trial and Creator Plans", description: "Compare TaleCrafter AI plans for illustrated storytelling. Start with your own image-generation key or choose Creator for branching stories, character bibles, and PDF export." },
  { path: "/explore", title: "Explore AI Illustrated Stories", description: "Read illustrated stories from the TaleCrafter community, from fantasy and mythology to science fiction, history, and more." },
] as const;

export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

export const safeImageUrl = (value: string | null | undefined) => {
  if (!value) return SITE_IMAGE;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : SITE_IMAGE;
  } catch {
    return SITE_IMAGE;
  }
};
