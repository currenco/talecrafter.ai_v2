import type { Metadata } from "next";
import { absoluteUrl, PUBLIC_PAGES, safeImageUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./config";

export const privateMetadata: Metadata = { robots: { index: false, follow: true } };

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | AI Illustrated Story Generator`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  ...privateMetadata,
};

export function pageMetadata({ title, description, path, image, index = true }: {
  title: string; description: string; path: string; image?: string | null; index?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const previewImage = safeImageUrl(image);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index, follow: true },
    openGraph: { type: "website", title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, images: [{ url: previewImage, alt: title }] },
    twitter: { card: image ? "summary_large_image" : "summary", title: `${title} | ${SITE_NAME}`, description, images: [previewImage] },
  };
}

export function publicPageMetadata(path: string) {
  const page = PUBLIC_PAGES.find(page => page.path === path);
  if (!page) throw new Error(`Missing SEO configuration for ${path}`);
  return pageMetadata(page);
}
