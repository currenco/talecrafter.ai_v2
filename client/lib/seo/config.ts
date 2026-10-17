export const SITE_URL = "https://www.talecrafterai.com";
export const SITE_NAME = "TaleCrafter AI";
export const SITE_DESCRIPTION =
  "Turn ideas into illustrated stories with TaleCrafter AI. Create classic and branching stories, develop characters, and export your storybook as a PDF.";
export const SITE_IMAGE = `${SITE_URL}/talecrafter-symbol.png`;

export const PUBLIC_PAGES = [
  { path: "/", title: "AI Illustrated Story Generator", description: SITE_DESCRIPTION },
  { path: "/about", title: "About Our AI Storybook Creator", description: "Discover TaleCrafter AI, a creative workspace for illustrated stories, character development, and interactive storytelling." },
  { path: "/pricing", title: "Free and Creator Plans", description: "Compare TaleCrafter AI plans for illustrated storytelling. Start with your own image-generation key or choose Creator for branching stories, character bibles, and PDF export." },
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
