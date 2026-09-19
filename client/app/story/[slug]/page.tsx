import { notFound } from "next/navigation";
import StoryPageClient from "./StoryPageClient";
import { getStoryBySlug } from "@/lib/story-data";

export default async function StorySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug);
  const story = await getStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  return <StoryPageClient initialStory={story} />;
}
