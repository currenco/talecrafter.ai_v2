import type { StoryOutput } from "@/types/story";

export type StoryRecord = {
  id: number;
  storyId: string | null;
  slug: string | null;
  storySubject: string | null;
  storyType: string | null;
  ageGroup: string | null;
  imageStyle: string | null;
  coverImage: string | null;
  output: StoryOutput | null;
  userName: string | null;
  userImage: string | null;
  userEmail: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

const API_BASE_URL =
  process.env.API_BASE_URL ?? "http://localhost:8000/api/v1";

const backendFetch = async <T>(path: string): Promise<T | null> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Backend request failed: ${response.status}`);

  const payload = await response.json();
  return payload?.data ?? null;
};

export const getStoryByStoryId = async (storyId: string) => {
  return backendFetch<StoryRecord>(`/stories/id/${encodeURIComponent(storyId)}`);
};

export const getStoryBySlug = async (slug: string) => {
  return backendFetch<StoryRecord>(`/stories/slug/${encodeURIComponent(slug)}`);
};

export const getStorySlug = async (story: StoryRecord | null | undefined) => {
  if (!story) return null;
  const slug = String(story.slug ?? "").trim();
  if (slug) return slug;
  return null;
};

export const storyRoutePath = (story: StoryRecord | null | undefined) => {
  const slug = String(story?.slug ?? "").trim();
  const storyId = String(story?.storyId ?? "").trim();

  if (slug) return `/story/${slug}`;
  if (storyId) return `/view-story/${storyId}`;
  return "/explore";
};

export const getRelatedStories = async (storyId: string, storyType?: string) => {
  const params = new URLSearchParams({ limit: "6", offset: "0" });
  if (storyType) params.set("storyType", storyType);

  const result = await backendFetch<{ stories: StoryRecord[] }>(
    `/stories/${encodeURIComponent(storyId)}/related?${params.toString()}`
  );

  return result?.stories ?? [];
};
