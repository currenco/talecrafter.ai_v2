"use client";
import { Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import { getAccessToken } from "@/lib/neon-auth/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import StoryItemCard from "../dashboard/_components/StoryItemCard";
import { apiFetch } from "@/lib/api-client";
import { motion } from "framer-motion";
import CustomLoader from "@/components/StoryGridSkeleton";
import type { StoryItem } from "@/types/story";
const MotionDiv = motion.div;

const PAGE_SIZE = 12;
const CACHE_KEY = "explore_stories_cache_v2";

type ExploreCache = {
  storyList: StoryItem[];
  offset: number;
  hasMoreStories: boolean;
  scrollY: number;
};

const ExploreMore = ({ genre, onGenreChange, userId }: { genre: string; onGenreChange: (genre: string) => void; userId?: string }) => {
  const cacheKey = `${CACHE_KEY}:${userId ?? "guest"}:${genre.toLowerCase()}`;
  const [genres, setGenres] = useState<string[]>([]);
  const [error, setError] = useState("");
  const activeRef = useRef(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [offset, setOffset] = useState(0);
  const [storyList, setStoryList] = useState<StoryItem[]>([]);
  const [hasMoreStories, setHasMoreStories] = useState(true);
  const [isRestored, setIsRestored] = useState(false);
  const initializedRef = useRef(false);
  const loadTriggerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const cacheRef = useRef({ storyList, offset, hasMoreStories });
  useEffect(() => {
    cacheRef.current = { storyList, offset, hasMoreStories };
  }, [storyList, offset, hasMoreStories]);

  useEffect(() => {
    activeRef.current = true;
    if (userId) void apiFetch<string[]>("/stories/genres")
      .then(result => { if (activeRef.current) setGenres(result); })
      .catch(() => { /* The selected genre remains usable if options cannot load. */ });
    return () => { activeRef.current = false; };
  }, [userId]);

  const fadeUp = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0 },
  };
  const isInitialStoriesLoading = !isRestored || (loading && storyList.length === 0);

  const persistState = useCallback(
    (scrollY?: number) => {
      try {
        const cache: ExploreCache = {
          ...cacheRef.current,
          scrollY: scrollY ?? window.scrollY ?? 0,
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch {
        // ignore storage failures
      }
    },
    [cacheKey]
  );

  const GetAllStories = useCallback(async (newOffset: number) => {
    if (loadingRef.current || !hasMoreRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({ limit: String(userId ? PAGE_SIZE : 8), offset: String(newOffset) });
      if (genre) query.set("genre", genre);
      const token = userId ? await getAccessToken() : undefined;
      const result = await apiFetch<StoryItem[]>(`/stories?${query}`, { token });
      if (!activeRef.current) return;

      setOffset(newOffset);
      offsetRef.current = newOffset;
      setStoryList((prev) => {
        const merged =
          newOffset === 0 ? result : [...(prev || []), ...(result || [])];
        const uniqueById = new Map<string, StoryItem>();
        merged.forEach((item: StoryItem) => {
          uniqueById.set(item.storyId, item);
        });
        return Array.from(uniqueById.values());
      });

      const nextHasMore = Boolean(userId) && result.length >= PAGE_SIZE;
      setHasMoreStories(nextHasMore);
      hasMoreRef.current = nextHasMore;

      if (newOffset === 0) {
        setStoryList(result || []);
      }
    } catch {
      if (!activeRef.current) return;
      setError("Unable to load stories. Please try again.");
      hasMoreRef.current = false;
      setHasMoreStories(false);
    } finally {
      loadingRef.current = false;
      if (activeRef.current) setLoading(false);
    }
  }, [genre, userId]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    hasMoreRef.current = hasMoreStories;
  }, [hasMoreStories]);

  useEffect(() => {
    if (!isRestored || error) return;
    persistState();
  }, [storyList, offset, hasMoreStories, persistState, isRestored, error]);

  useEffect(() => {
    const onPageHide = () => persistState();
    window.addEventListener("pagehide", onPageHide);
    if (initializedRef.current) return () => window.removeEventListener("pagehide", onPageHide);
    initializedRef.current = true;

    let restored = false;
    try {
      const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const parsed: ExploreCache = JSON.parse(raw);
          if (Array.isArray(parsed.storyList) && parsed.storyList.length > 0) {
            restored = true;
            setStoryList(userId ? parsed.storyList : parsed.storyList.slice(0, 8));
            setOffset(parsed.offset ?? 0);
            offsetRef.current = parsed.offset ?? 0;
            const inferredHasMore = Boolean(userId) && (
              parsed.hasMoreStories ??
              (parsed.storyList.length % PAGE_SIZE === 0));
            setHasMoreStories(inferredHasMore);
            hasMoreRef.current = inferredHasMore;
            requestAnimationFrame(() => {
              if (activeRef.current) window.scrollTo({ top: parsed.scrollY ?? 0, behavior: "auto" });
            });
          }
      }
    } catch {
      // ignore invalid cache
    }

    if (!restored) {
      window.scrollTo({ top: 0, behavior: "auto" });
      GetAllStories(0);
    }
    setIsRestored(true);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [GetAllStories, persistState, cacheKey, userId]);

  useEffect(() => {
    if (!isRestored) return;
    const trigger = loadTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (loadingRef.current || !hasMoreRef.current) return;
        GetAllStories(offsetRef.current + PAGE_SIZE);
      },
      { root: null, rootMargin: "220px 0px", threshold: 0.01 }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [GetAllStories, isRestored]);

  useEffect(() => {
    if (!isRestored) return;

    const onScroll = () => {
      if (loadingRef.current || !hasMoreRef.current) return;
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 320;
      if (nearBottom) {
        GetAllStories(offsetRef.current + PAGE_SIZE);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [GetAllStories, isRestored]);

  useEffect(() => {
    if (!isRestored || loading || !hasMoreStories) return;
    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 320;
    if (nearBottom) {
      GetAllStories(offsetRef.current + PAGE_SIZE);
    }
  }, [GetAllStories, hasMoreStories, isRestored, loading, storyList.length]);

  return (
      <div>
        {userId && <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#f1eadb]">
          <label htmlFor="explore-genre" className="font-medium">Genre</label>
          <select id="explore-genre" value={genre} onChange={event => onGenreChange(event.target.value)}
            className="min-h-11 w-full max-w-xs rounded-md border border-white/25 bg-[#162331] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
            <option value="">All genres</option>
            {genre && !genres.includes(genre) && <option value={genre}>{genre}</option>}
            {genres.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>}

        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="mt-8"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {storyList?.map((item: StoryItem) => (
              <div key={item.storyId}>
                <StoryItemCard story={item} />
              </div>
            ))}
          </div>
        </MotionDiv>

        <CustomLoader isLoading={isInitialStoriesLoading || loading} count={storyList.length ? 4 : userId ? PAGE_SIZE : 8} />

        <div ref={loadTriggerRef} className="h-6" />

        {error && <div role="alert" className="mt-6 text-center text-[#f1eadb]">
          <p>{error}</p>
          <button className="mt-3 min-h-11 px-4 py-2 text-sm underline underline-offset-4" onClick={() => {
            hasMoreRef.current = true;
            void GetAllStories(storyList.length ? offsetRef.current + PAGE_SIZE : 0);
          }}>Try again</button>
        </div>}

        {!userId && !error && !isInitialStoriesLoading && storyList.length >= 8 && (
          <div className="mt-8 border-t border-white/15 py-6 text-center text-[#f1eadb]">
            <p className="text-lg font-semibold">Keep exploring stories</p>
            <p className="mt-2 text-sm text-[#c3cbd4]">Sign in to browse the full library.</p>
            <Link href={`/sign-in?redirect=${encodeURIComponent(genre ? `/explore?${new URLSearchParams({ genre })}` : "/explore")}`} className="mt-4 inline-flex min-h-11 items-center rounded-md bg-emerald-200 px-4 py-2 text-sm font-semibold leading-5 text-emerald-950 sm:px-5 sm:py-2.5">Sign in to explore more</Link>
          </div>
        )}

        {!error && !hasMoreStories && storyList.length > 0 && (userId || storyList.length < 8) && (
          <div className="mt-10 w-full text-center">
            <p className="text-[#c3cbd4]/70">
              No more stories available right now. Check back later.
            </p>
          </div>
        )}

        {!error && !isInitialStoriesLoading && storyList.length === 0 && (
          <div className="mt-10 w-full text-center">
            <p className="text-[#c3cbd4]/70">
              {genre ? `No stories found for ${genre}.` : "No stories found yet."}
            </p>
          </div>
        )}
    </div>
  );
};

function ExploreQuery() {
  const { isAuthLoaded, isSignedIn, authUser } = useContext(UserDetailContext);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const genre = searchParams.get("genre")?.trim() ?? "";
  const changeGenre = (value: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (value) query.set("genre", value);
    else query.delete("genre");
    query.delete("offset");
    router.push(query.size ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  if (!isAuthLoaded) return <CustomLoader isLoading count={8} />;
  const userId = isSignedIn ? authUser?.id : undefined;
  return <ExploreMore key={`${userId ?? "guest"}:${genre}`} genre={genre} onGenreChange={changeGenre} userId={userId} />;
}

export default function ExplorePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1522] px-5 py-8 md:px-16 lg:px-28 xl:px-40">
      <div className="tc-hero-grid absolute inset-0 opacity-35" />
      <div className="relative">
        <header className="px-5 py-7 text-center md:px-8">
          <p className="text-xs font-semibold uppercase text-[#d8c69e]">Community library</p>
          <h1 className="mt-2 font-serif text-2xl font-medium leading-tight tracking-normal text-[#f1eadb] sm:text-3xl lg:text-4xl">Explore Stories</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#c3cbd4]/75 sm:text-base sm:leading-7">
            Discover storybooks created by the community across genres and illustration styles.
          </p>
        </header>
        <Suspense fallback={
          <div className="mt-8"><CustomLoader isLoading count={8} /></div>
        }>
          <ExploreQuery />
        </Suspense>
      </div>
    </div>
  );
}
