import type { StoryRecord } from "@/lib/story-data";
import { getCleanChapterText } from "@/lib/story-text";
import { pageMetadata } from "./metadata";
import { absoluteUrl, safeImageUrl, SITE_NAME, SITE_URL } from "./config";

export const storyPath = (slug: string) => `/story/${encodeURIComponent(slug)}`;
export const storyTitle = (story: StoryRecord) => story.output?.title?.trim() || "Illustrated Story";
export const storyDescription = (story: StoryRecord) => {
  const chapter = story.output?.chapters?.find(chapter => getCleanChapterText(chapter));
  const text = (chapter ? getCleanChapterText(chapter) : story.storySubject ?? "").replace(/\s+/g, " ").trim();
  return text ? (text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text) : `Read ${storyTitle(story)}, an illustrated story on ${SITE_NAME}.`;
};

export const storyMetadata = (story: StoryRecord) => pageMetadata({
  title: storyTitle(story), description: storyDescription(story),
  path: storyPath(story.slug!), image: story.coverImage,
});

export const storyStructuredData = (story: StoryRecord) => {
  const url = absoluteUrl(storyPath(story.slug!));
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CreativeWork", "@id": `${url}#story`, name: storyTitle(story), description: storyDescription(story), url,
        image: safeImageUrl(story.coverImage), genre: story.storyType || undefined,
        datePublished: story.createdAt || undefined, dateModified: story.updatedAt || undefined,
        publisher: { "@id": `${SITE_URL}/#organization` } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Explore Stories", item: `${SITE_URL}/explore` },
        { "@type": "ListItem", position: 3, name: storyTitle(story), item: url },
      ] },
    ],
  };
};
