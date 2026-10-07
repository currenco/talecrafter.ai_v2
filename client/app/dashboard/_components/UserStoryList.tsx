"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { toast } from "react-toastify";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import type { StoryItem } from "@/types/story";
import StoryItemCard from "./StoryItemCard";

const PAGE_SIZE = 12;

type StoryStatus = "draft" | "published";

type StoryPage = {
  items: StoryItem[];
  pagination: {
    limit: number;
    offset: number;
    totalCount: number;
    hasMore: boolean;
  };
};

type StoryCollection = {
  items: StoryItem[];
  totalCount: number;
  hasMore: boolean;
};

const emptyCollection = (): StoryCollection => ({
  items: [],
  totalCount: 0,
  hasMore: false,
});

const mergeStories = (current: StoryItem[], incoming: StoryItem[]) =>
  Array.from(
    new Map(
      [...current, ...incoming].map((story) => [story.storyId, story]),
    ).values(),
  );

const UserStoryList = () => {
  const { authUser, isAuthLoaded } = useContext(UserDetailContext);
  const userId = authUser?.id;
  const userIdRef = useRef(userId);
  const draftTriggerRef = useRef<HTMLDivElement>(null);
  const publishedTriggerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<Record<StoryStatus, boolean>>({
    draft: false,
    published: false,
  });
  const [completed, setCompleted] = useState<StoryCollection>(emptyCollection);
  const [drafts, setDrafts] = useState<StoryCollection>(emptyCollection);
  const [loading, setLoading] = useState<Record<StoryStatus, boolean>>({
    draft: false,
    published: false,
  });

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const loadStories = useCallback(
    async (status: StoryStatus, offset = 0) => {
      if (!isAuthLoaded || !userId) return;
      if (loadingRef.current[status]) return;

      const requestUserId = userId;
      loadingRef.current[status] = true;
      setLoading((current) => ({ ...current, [status]: true }));

      try {
        const token = await getAccessToken();
        const result = await apiFetch<StoryPage>(
          `/stories/me?status=${status}&limit=${PAGE_SIZE}&offset=${offset}`,
          { token },
        );

        if (userIdRef.current !== requestUserId) return;

        const updateCollection = (
          current: StoryCollection,
        ): StoryCollection => ({
          items:
            offset === 0
              ? result.items
              : mergeStories(current.items, result.items),
          totalCount: result.pagination.totalCount,
          hasMore: result.pagination.hasMore,
        });

        if (status === "published") {
          setCompleted(updateCollection);
        } else {
          setDrafts(updateCollection);
        }
      } catch {
        toast.error(
          status === "published"
            ? "Unable to load your stories"
            : "Unable to load draft stories",
        );
      } finally {
        loadingRef.current[status] = false;
        if (userIdRef.current === requestUserId) {
          setLoading((current) => ({ ...current, [status]: false }));
        }
      }
    },
    [isAuthLoaded, userId],
  );

  useEffect(() => {
    if (!isAuthLoaded) return;

    if (!userId) {
      setCompleted(emptyCollection());
      setDrafts(emptyCollection());
      return;
    }

    void Promise.all([loadStories("published"), loadStories("draft")]);
  }, [isAuthLoaded, loadStories, userId]);

  useEffect(() => {
    if (!drafts.hasMore || loading.draft) return;
    const trigger = draftTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadStories("draft", drafts.items.length);
        }
      },
      { root: null, rootMargin: "220px 0px", threshold: 0.01 },
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [drafts.hasMore, drafts.items.length, loadStories, loading.draft]);

  useEffect(() => {
    if (!completed.hasMore || loading.published) return;
    const trigger = publishedTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadStories("published", completed.items.length);
        }
      },
      { root: null, rootMargin: "220px 0px", threshold: 0.01 },
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [
    completed.hasMore,
    completed.items.length,
    loadStories,
    loading.published,
  ]);

  const handleStoryDeleted = (storyId: string) => {
    const removeStory = (collection: StoryCollection): StoryCollection => {
      const nextItems = collection.items.filter(
        (story) => story.storyId !== storyId,
      );
      if (nextItems.length === collection.items.length) return collection;

      return {
        ...collection,
        items: nextItems,
        totalCount: Math.max(0, collection.totalCount - 1),
      };
    };

    setCompleted(removeStory);
    setDrafts(removeStory);
  };

  const renderSection = ({
    title,
    description,
    emptyMessage,
    collection,
    status,
    loadTriggerRef,
  }: {
    title: string;
    description: string;
    emptyMessage: string;
    collection: StoryCollection;
    status: StoryStatus;
    loadTriggerRef: RefObject<HTMLDivElement>;
  }) => (
    <section className="tc-glass-panel-soft mt-8 p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-serif text-3xl font-medium text-[#f1eadb]">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[#c3cbd4]/70">{description}</p>
        </div>
        {!loading[status] || collection.totalCount > 0 ? (
          <p className="text-sm text-[#c3cbd4]/60">
            {collection.totalCount}{" "}
            {collection.totalCount === 1 ? "story" : "stories"}
          </p>
        ) : null}
      </div>

      {collection.items.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.items.map((story) => (
            <StoryItemCard
              key={story.storyId}
              story={story}
              canDelete
              onDeleteSuccess={handleStoryDeleted}
            />
          ))}
        </div>
      ) : !loading[status] ? (
        <p className="mt-6 text-[#c3cbd4]/70">{emptyMessage}</p>
      ) : null}

      <div ref={loadTriggerRef} className="h-6" aria-hidden="true" />

      {loading[status] ? (
        <div className="mt-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#d8c69e] border-t-transparent" />
        </div>
      ) : null}
    </section>
  );

  return (
    <div>
      {renderSection({
        title: "Draft Stories",
        description: "Continue any story that is still in progress.",
        emptyMessage: "You have no unfinished stories.",
        collection: drafts,
        status: "draft",
        loadTriggerRef: draftTriggerRef,
      })}
      {renderSection({
        title: "Your Stories",
        description: "All your completed Classic and Interactive stories.",
        emptyMessage: "You have not completed a story yet.",
        collection: completed,
        status: "published",
        loadTriggerRef: publishedTriggerRef,
      })}
    </div>
  );
};

export default UserStoryList;
