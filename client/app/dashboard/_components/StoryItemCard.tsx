"use client";
import { Card, CardFooter } from "@nextui-org/card";
import { Button } from "@nextui-org/react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";
import { useState } from "react";
import { getAccessToken } from "@/lib/neon-auth/client";
import {
  apiFetch,
  ApiClientError,
  createIdempotencyKey,
} from "@/lib/api-client";
import { waitForStoryPublication } from "@/lib/story-generation";
import type { StoryItem } from "@/types/story";
import { useRouter } from "next/navigation";

type StoryItemType = {
  story: StoryItem;
  canDelete?: boolean;
  onDeleteSuccess?: (storyId: string) => void;
};

const removeStoryFromCachedLists = (storyId: string) => {
  if (typeof window === "undefined") return;

  const cacheKeys = ["explore_stories_cache_v1"];
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith("dashboard_stories_cache_v1_")) {
      cacheKeys.push(key);
    }
  }

  cacheKeys.forEach((key) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.storyList)) return;

      parsed.storyList = parsed.storyList.filter(
        (item: { storyId?: string }) => item.storyId !== storyId,
      );
      sessionStorage.setItem(key, JSON.stringify(parsed));
    } catch {
      // Ignore invalid cache entries.
    }
  });
};

const StoryItemCard = ({
  story,
  canDelete = false,
  onDeleteSuccess,
}: StoryItemType) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [resuming, setResuming] = useState(false);
  const router = useRouter();
  const isDraft = story.status === "draft";
  const isInteractive = story.kind === "interactive";
  const chapterImages =
    story.output?.chapters?.filter((chapter) => Boolean(chapter.imageUrl))
      .length ?? 0;
  const completedImages = chapterImages + (story.coverImage ? 1 : 0);
  const totalImages = (story.output?.chapters?.length ?? 0) + 1;
  const storyHref = story?.slug
    ? `/story/${story.slug}`
    : `/view-story/${story?.storyId}`;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // prevent navigating via <Link>
    try {
      const token = await getAccessToken();
      await apiFetch(`/stories/${story.storyId}`, { method: "DELETE", token });
      toast.success("Story deleted successfully");
      removeStoryFromCachedLists(story.storyId);
      onDeleteSuccess?.(story.storyId);
    } catch {
      toast.error("Failed to delete story");
    }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      const token = await getAccessToken();
      await apiFetch(`/stories/${story.storyId}/resume`, {
        method: "POST",
        token,
        idempotencyKey: createIdempotencyKey(),
      });
      const published = await waitForStoryPublication({
        storyId: story.storyId,
        token,
      });
      toast.success("Story images completed");
      router.push(`/story/${published.slug}`);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Unable to resume story generation",
      );
    } finally {
      setResuming(false);
    }
  };

  const storyCard = (
    <Card
      isFooterBlurred
      radius="lg"
      className="cursor-pointer overflow-hidden border border-[#d8c69e]/15 bg-[#111d2b] transition-all hover:-translate-y-1 hover:border-[#d8c69e]/35"
    >
      {imgFailed || !story?.coverImage ? (
        <div className="flex h-[200px] w-full items-center justify-center bg-[#172535] px-4 text-center text-sm text-[#c3cbd4]/70">
          {isDraft
            ? "This draft is waiting for its remaining images."
            : "Cover image is unavailable. You can still open and read this story."}
        </div>
      ) : (
        <div className="relative h-[200px] w-full">
          <Image
            alt={story?.output?.title ?? "Book cover image"}
            className="object-cover"
            fill
            sizes="(max-width: 1024px) 100vw, 25vw"
            src={story?.coverImage}
            unoptimized
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        </div>
      )}
      <CardFooter className="absolute bottom-0 z-10 w-full justify-between rounded-xl border-1 border-[#d8c69e]/15 bg-[#0b1522]/85 py-2 shadow-small backdrop-blur-xl">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[#f1eadb]">
            {story?.output?.title}
          </p>
          {isDraft && (
            <p className="text-xs text-[#c3cbd4]/70">
              {isInteractive
                ? `Draft - ${story.output?.chapters?.length ?? 0} pages`
                : `Draft - ${completedImages}/${totalImages} images`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {isDraft && isInteractive ? (
            <Button
              as={Link}
              href={`/interactive-story/${story.storyId}`}
              className="text-tiny text-white bg-black/40"
              variant="flat"
              radius="full"
              size="sm"
            >
              Continue
            </Button>
          ) : isDraft ? (
            <Button
              onClick={handleResume}
              isLoading={resuming}
              isDisabled={resuming}
              className="text-tiny text-white bg-black/40"
              variant="flat"
              radius="full"
              size="sm"
            >
              Resume
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              onClick={handleDelete}
              className="text-tiny text-white bg-black/20"
              variant="flat"
              radius="full"
              size="sm"
            >
              Delete
            </Button>
          ) : (
            !isDraft && (
              <Button
                className="text-tiny text-white bg-black/20"
                variant="flat"
                radius="full"
                size="sm"
              >
                Read
              </Button>
            )
          )}
        </div>
      </CardFooter>
    </Card>
  );

  if (isDraft) return storyCard;
  return <Link href={storyHref}>{storyCard}</Link>;
};

export default StoryItemCard;
