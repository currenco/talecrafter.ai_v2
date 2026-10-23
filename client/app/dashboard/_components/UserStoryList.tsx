"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { userErrorMessage } from "@/lib/user-messages";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import type { StoryItem } from "@/types/story";
import StoryItemCard from "./StoryItemCard";
import StoryGridSkeleton from "@/components/StoryGridSkeleton";

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
  const [loadedFor, setLoadedFor] = useState<Record<StoryStatus, string | undefined>>({ draft: undefined, published: undefined });
  const [errors, setErrors] = useState<Record<StoryStatus, string>>({ draft: "", published: "" });
  const [loading, setLoading] = useState<Record<StoryStatus, boolean>>({
    draft: false,
    published: false,
  });
  const initialLoading = !isAuthLoaded || Boolean(userId && (
    (loadedFor.draft !== userId && !errors.draft) ||
    (loadedFor.published !== userId && !errors.published)
  ));

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
      setErrors(current => ({ ...current, [status]: "" }));

      try {
        const token = await getAccessToken();
        const result = await apiFetch<StoryPage>(
          `/stories/me?status=${status}&limit=${PAGE_SIZE}&offset=${offset}`,
          { token, cache: "no-store" },
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
        setLoadedFor(current => ({ ...current, [status]: requestUserId }));
      } catch (error) {
        if (userIdRef.current === requestUserId) setErrors(current => ({ ...current, [status]: userErrorMessage(error, "We couldn't load your stories. Please try again.") }));
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
      setLoadedFor({ draft: undefined, published: undefined });
      return;
    }

    void Promise.all([loadStories("published"), loadStories("draft")]);
  }, [isAuthLoaded, loadStories, userId]);

  useEffect(() => {
    if (initialLoading || !drafts.hasMore || loading.draft || errors.draft) return;
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
  }, [initialLoading, drafts.hasMore, drafts.items.length, loadStories, loading.draft, errors.draft]);

  useEffect(() => {
    if (initialLoading || !completed.hasMore || loading.published || errors.published) return;
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
    initialLoading,
    completed.hasMore,
    completed.items.length,
    loadStories,
    loading.published,
    errors.published,
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
    collection,
    status,
    loadTriggerRef,
  }: {
    title: string;
    description: string;
    collection: StoryCollection;
    status: StoryStatus;
    loadTriggerRef: RefObject<HTMLDivElement>;
  }) => (
    <section className="tc-glass-panel-soft mt-8 p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-medium leading-snug tracking-normal text-[#f1eadb] sm:text-2xl lg:text-3xl">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[#c3cbd4]/70">{description}</p>
        </div>
        {(isAuthLoaded && !loading[status] && !errors[status]) || collection.totalCount > 0 ? (
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
      ) : null}

      <StoryGridSkeleton isLoading={!isAuthLoaded || loading[status]} count={4} />
      {errors[status] && <div role="alert" className="mt-4 text-sm text-[#c3cbd4]">
        <p>{errors[status]}</p>
        <button className="mt-2 min-h-11 text-[#d8c69e] underline" onClick={() => void loadStories(status, collection.items.length)}>Try again</button>
      </div>}

      <div ref={loadTriggerRef} className="h-6" aria-hidden="true" />
    </section>
  );

  const isEmpty = (status: StoryStatus, collection: StoryCollection) =>
    Boolean(userId) && loadedFor[status] === userId &&
    !loading[status] && !errors[status] && collection.totalCount === 0;

  if (initialLoading) {
    return <StoryGridSkeleton isLoading count={4} className="mt-8" />;
  }

  if (isEmpty("draft", drafts) && isEmpty("published", completed)) {
    return <p className="mt-8 text-center text-sm leading-6 text-[#c3cbd4]/70 sm:text-base">You haven&apos;t created any stories yet.</p>;
  }

  return (
    <div>
      {!isEmpty("draft", drafts) && renderSection({
        title: "Draft Stories",
        description: "Continue any story that is still in progress.",
        collection: drafts,
        status: "draft",
        loadTriggerRef: draftTriggerRef,
      })}
      {!isEmpty("published", completed) && renderSection({
        title: "Your Stories",
        description: "Your completed Classic and Plot Twist stories.",
        collection: completed,
        status: "published",
        loadTriggerRef: publishedTriggerRef,
      })}
    </div>
  );
};

export default UserStoryList;
