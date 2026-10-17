import { notFound } from "next/navigation";
import StoryPageClient from "./StoryPageClient";
import { getStoryBySlug } from "@/lib/story-data";
import { storyMetadata, storyStructuredData } from "@/lib/seo/story";
import JsonLd from "@/components/seo/JsonLd";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();
  return storyMetadata(story);
}

export default async function StorySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const story = await getStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  return <><JsonLd data={storyStructuredData(story)} /><StoryPageClient initialStory={story} /></>;
}
