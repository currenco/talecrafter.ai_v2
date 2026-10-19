"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import dynamic from "next/dynamic";
import { IoIosArrowDropleftCircle, IoIosArrowDroprightCircle } from "react-icons/io";
import { toast } from "react-toastify";
import BookCoverPage from "@/app/view-story/_components/BookCoverPage";
import StoryPages from "@/app/view-story/_components/StoryPages";
import { buildPollinationsImageUrl } from "@/lib/story-images";
import { apiFetch } from "@/lib/api-client";
import type { StoryRecord } from "@/lib/story-data";
import type { StoryChapter } from "@/types/story";
import { getCleanChapterText } from "@/lib/story-text";

import CreatorStoryPack from "@/components/CreatorStoryPack";
import StoryGridSkeleton from "@/components/StoryGridSkeleton";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import { getAccessToken } from "@/lib/neon-auth/client";

type StoryPageClientProps = {
  initialStory: StoryRecord;
};

const SHOW_STORY_LAYOUT_SWITCH = false;
const BookTextContext = createContext<StoryChapter[]>([]);

function ReadableBookFallback() {
  const chapters = useContext(BookTextContext);
  return (
    <div className="h-[620px] w-full max-w-[380px] overflow-y-auto rounded-lg bg-white p-5 text-slate-800" aria-label="Story text">
      {chapters.map((chapter, index) => (
        <section key={index} className="mb-6">
          <h2 className="text-lg font-semibold">{chapter.title || `Chapter ${index + 1}`}</h2>
          <p className="mt-3 whitespace-pre-line text-base leading-7">{getCleanChapterText(chapter)}</p>
        </section>
      ))}
    </div>
  );
}

type FlipBookHandle = {
  pageFlip: () => {
    flipPrev: () => void;
    flipNext: () => void;
  };
};

const HTMLFlipBook = dynamic(() => import("react-pageflip"), {
  ssr: false,
  loading: ReadableBookFallback,
});

function SafeStoryModeImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="mt-3 flex min-h-[240px] w-full items-center justify-center rounded-lg border border-[#d8c69e]/40 bg-[#f4eddd] px-6 text-center text-sm text-slate-600">
        We couldn&apos;t load this illustration right now. You can continue reading the story text.
      </div>
    );
  }

  return (
    <div className="relative mt-3 min-h-[240px] w-full overflow-hidden rounded-lg bg-transparent">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-contain"
        unoptimized
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

const getOutputTitle = (story: StoryRecord) =>
  String(story.output?.title ?? "AI Generated Story");

const getStorySummary = (story: StoryRecord) => {
  const firstText = String(story?.output?.chapters?.[0]?.textPrompt ?? story?.storySubject ?? "")
    .replace(/\{[^}]*\}/g, "")
    .trim();

  if (firstText.length > 30) {
    return firstText.slice(0, 220);
  }

  return `Read '${getOutputTitle(story)}', an AI generated story created with TaleCrafter AI.`;
};

export default function StoryPageClient({ initialStory }: StoryPageClientProps) {
  const { userDetail, isSignedIn, isAuthLoaded } = useContext(UserDetailContext);
  const RELATED_PAGE_SIZE = 10;
  const bookRef = useRef<FlipBookHandle | null>(null);
  const [story] = useState<StoryRecord>(initialStory);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [contentMode, setContentMode] = useState<"flipbook" | "story">("flipbook");
  const [activeNarrationKey, setActiveNarrationKey] = useState<number | null>(null);
  const [relatedStories, setRelatedStories] = useState<StoryRecord[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedTotalPages, setRelatedTotalPages] = useState(0);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState(false);
  const relatedRequest = useRef(0);

  const title = getOutputTitle(story);
  const summary = useMemo(() => getStorySummary(story), [story]);
  const chapters = story?.output?.chapters ?? [];

  const introText = useMemo(() => {
    const clean = summary.endsWith(".") ? summary : `${summary}.`;
    return `${clean} Enjoy this full AI-crafted reading experience below.`;
  }, [summary]);

  const getRelatedStories = useCallback(async (page: number) => {
    if (!story?.storyId) {
      setRelatedLoading(false);
      return;
    }

    const request = ++relatedRequest.current;
    setRelatedLoading(true);
    setRelatedError(false);
    try {
      const safePage = Math.max(1, page);
      const offset = (safePage - 1) * RELATED_PAGE_SIZE;
      const storyType = String(story?.storyType ?? "").trim();
      const params = new URLSearchParams({
        limit: String(RELATED_PAGE_SIZE),
        offset: String(offset),
      });
      if (storyType) params.set("storyType", storyType);

      const result = await apiFetch<{ stories: StoryRecord[]; totalCount: number }>(
        `/stories/${story.storyId}/related?${params.toString()}`
      );

      if (request !== relatedRequest.current) return;
      const totalCount = Number(result?.totalCount ?? 0);
      const pages = Math.ceil(totalCount / RELATED_PAGE_SIZE);
      setRelatedStories(result?.stories ?? []);
      setRelatedTotalPages(pages);

      if (pages > 0 && safePage > pages) {
        setRelatedPage(pages);
      }
    } catch {
      if (request === relatedRequest.current) setRelatedError(true);
    } finally {
      if (request === relatedRequest.current) setRelatedLoading(false);
    }
  }, [story]);

  useEffect(() => {
    setRelatedPage(1);
  }, [story?.storyId]);

  useEffect(() => {
    getRelatedStories(relatedPage);
    return () => { relatedRequest.current += 1; };
  }, [getRelatedStories, relatedPage]);

  const changeRelatedPage = (page: number) => {
    if (relatedLoading || page === relatedPage) return;
    setRelatedLoading(true);
    setRelatedError(false);
    setRelatedPage(page);
  };

  const getVisiblePageNumbers = () => {
    if (relatedTotalPages <= 1) return [];
    const start = Math.max(1, relatedPage - 2);
    const end = Math.min(relatedTotalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  };

  const onShareStory = async () => {
    const storyUrl = typeof window !== "undefined" ? window.location.href : "";
    if (!storyUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out this story: ${title}`,
          url: storyUrl,
        });
      } catch {
        // user cancelled share flow
      }
      return;
    }

    await navigator.clipboard.writeText(storyUrl);
    setCopied(true);
    toast("Story link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getChapterImageUrl = (chapter: StoryChapter) => {
    const persistedImage = String(chapter?.imageUrl ?? "").trim();
    if (persistedImage) return persistedImage;

    return buildPollinationsImageUrl(
      chapter?.imagePrompt ?? chapter?.title ?? "Story illustration",
      { seed: 0 }
    );
  };

  const onDownloadPdf = async () => {
    if (!story || downloadingPdf) return;
    if (!userDetail?.canExport) { toast.info("PDF export is included with Creator."); return; }
    setDownloadingPdf(true);
    try {
      await apiFetch(`/stories/${encodeURIComponent(story.storyId ?? "")}/creator-pack`, { token: await getAccessToken() });
      const { downloadStoryPdf } = await import("@/lib/story-pdf");
      await downloadStoryPdf({
        title,
        cover: story.coverImage,
        scenes: chapters.map(chapter => ({
          title: chapter.title,
          text: getCleanChapterText(chapter),
          image: getChapterImageUrl(chapter),
        })),
      });
      toast.success("PDF download started");
    } catch {
      toast.error("We couldn't prepare your PDF. Check your connection and try again.");
    } finally { setDownloadingPdf(false); }
  };
  const stopNarration = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setActiveNarrationKey(null);
  };

  useEffect(() => {
    stopNarration();
  }, [contentMode]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1522] px-5 py-8 md:px-16 lg:px-28 xl:px-40">
      <div className="tc-hero-grid absolute inset-0 opacity-35" />
      <div className="tc-hero-orb tc-hero-orb-one" />
      <div className="tc-hero-orb tc-hero-orb-two" />

      <div className="relative">
        <div className="tc-glass-panel px-5 py-6 text-center shadow-[0_16px_45px_rgba(0,0,0,0.35)] md:px-8">
          <h1 className="font-serif text-4xl font-medium tracking-tight text-[#f1eadb] sm:text-5xl md:text-6xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-4xl text-sm leading-relaxed text-[#c3cbd4]/80 md:text-base">
            {introText}
          </p>
        </div>

        {contentMode === "flipbook" && (
          <>
            <div className="mt-8 flex flex-col items-center">
              <BookTextContext.Provider value={chapters}>
              {/* @ts-expect-error -- react-pageflip's published props require internal defaults. */}
              <HTMLFlipBook
                className="max-w-[84vw] md:max-w-[62vw] lg:max-w-[48vw]"
                width={330}
                height={620}
                showCover={true}
                useMouseEvents={false}
                ref={bookRef}
                style={{ height: "auto", maxHeight: "auto" }}
              >
                <div className="p-0">
                  <BookCoverPage imageUrl={story?.coverImage} />
                </div>
                {chapters.map((chapter, index) => (
                  <div key={index} className="bg-white p-4 md:p-5">
                    <StoryPages
                      storyChapter={chapter}
                      chapterKey={index}
                      activeNarrationKey={activeNarrationKey}
                      onStartNarration={(key: number) => setActiveNarrationKey(key)}
                      onStopNarration={(key: number) => {
                        setActiveNarrationKey((prev) => (prev === key ? null : prev));
                      }}
                    />
                  </div>
                ))}
              </HTMLFlipBook>
              </BookTextContext.Provider>
            </div>

            <div className="mt-7 flex w-full items-center justify-between">
              <button
                className={`tc-icon-btn p-2 ${count <= 0 ? "pointer-events-none opacity-40" : ""}`}
                onClick={() => {
                  if (count <= 0) return;
                  stopNarration();
                  bookRef.current?.pageFlip().flipPrev();
                  setCount((prev) => prev - 1);
                }}
                aria-label="Previous page"
              >
                <IoIosArrowDropleftCircle className="text-4xl" />
              </button>

              <div className="flex items-center gap-2">
                <button onClick={onShareStory} className="tc-btn-primary px-5 py-2 text-sm">
                  {copied ? "Link Copied!" : "Share Story"}
                </button>
              </div>

              <button
                className={`tc-icon-btn p-2 ${
                  count >= chapters.length ? "pointer-events-none opacity-40" : ""
                }`}
                onClick={() => {
                  if (count >= chapters.length) return;
                  stopNarration();
                  bookRef.current?.pageFlip().flipNext();
                  setCount((prev) => prev + 1);
                }}
                aria-label="Next page"
              >
                <IoIosArrowDroprightCircle className="text-4xl" />
              </button>
            </div>
          </>
        )}

        {chapters.length > 0 && (
          <div className="tc-glass-panel-soft mt-10 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-3xl font-medium text-[#f1eadb]">Full Story</h2>
                {SHOW_STORY_LAYOUT_SWITCH && <p className="mt-2 text-sm text-[#c3cbd4]/75 md:text-base">
                  Switch between flipbook and full story layout.
                </p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onDownloadPdf}
                  disabled={downloadingPdf || !story || !userDetail?.canExport}
                  title={!userDetail?.canExport ? "Creator subscription required" : undefined}
                  className="tc-btn-ghost inline-flex items-center gap-2 px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {!userDetail?.canExport && <LockKeyhole size={18} className="shrink-0" aria-hidden="true" />}
                  {downloadingPdf ? "Generating PDF..." : userDetail?.canExport ? "Download PDF" : "PDF export - Creator Only"}
                </button>
                <CreatorStoryPack storyId={story.storyId} />
                {SHOW_STORY_LAYOUT_SWITCH && <div className="tc-toggle-wrap">
                  <button
                    onClick={() => {
                      stopNarration();
                      setContentMode("flipbook");
                    }}
                    className={`tc-toggle-btn ${contentMode === "flipbook" ? "tc-toggle-btn-active" : ""}`}
                  >
                    Flipbook
                  </button>
                  <button
                    onClick={() => {
                      stopNarration();
                      setContentMode("story");
                    }}
                    className={`tc-toggle-btn ${contentMode === "story" ? "tc-toggle-btn-active" : ""}`}
                  >
                    Story
                  </button>
                </div>}
              </div>
            </div>

            {contentMode === "story" ? (
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                {chapters.map((chapter, index) => (
                  <article
                    key={`story-map-${index}`}
                    className="rounded-xl border border-[#d8c69e]/20 bg-[#111d2b]/70 p-4"
                  >
                    <h3 className="mt-1 text-xl font-semibold text-[#f1eadb]">{chapter?.title ?? "Untitled Chapter"}</h3>
                    <SafeStoryModeImage
                      src={getChapterImageUrl(chapter)}
                      alt={chapter?.title ?? "story chapter image"}
                    />
                    <p className="mt-3 text-sm leading-relaxed text-[#c3cbd4]/85 md:text-base">
                      {getCleanChapterText(chapter)}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="tc-glass-panel-soft mt-10 p-5 md:p-7 text-center">
          <h2 className="font-serif text-3xl font-medium text-[#f1eadb]">Generate Your Own AI Story</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-[#c3cbd4]/75 md:text-base">
            Create your own personalized illustrated story in minutes.
          </p>
          <Link href="/create-story" className="tc-btn-primary mt-4 inline-flex px-5 py-2 text-sm" prefetch={true}>
            Create Story
          </Link>
        </div>

        <div className="tc-glass-panel-soft mt-10 p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-3xl font-medium text-[#f1eadb]">More Stories Like This</h2>
            <Link href="/explore" prefetch={true} className="tc-btn-ghost px-4 py-2 text-sm">
              View Explore
            </Link>
          </div>

          <div className="mt-2 min-h-5 text-sm text-[#c3cbd4]/70">
            {relatedTotalPages > 0 && <>Page {relatedPage} of {relatedTotalPages}</>}
          </div>

          <div aria-busy={relatedLoading}>
          <StoryGridSkeleton isLoading={relatedLoading} count={RELATED_PAGE_SIZE} variant="related" />
          {!relatedLoading && relatedError ? <div role="alert" className="mt-5 text-sm text-[#c3cbd4]">
            <p>We couldn&apos;t load more stories.</p>
            <button type="button" onClick={() => getRelatedStories(relatedPage)} className="tc-btn-ghost mt-3 px-4 py-2 text-sm">Try again</button>
          </div> : !relatedLoading && <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {relatedStories.map((item) => {
              const href = item?.slug ? `/story/${item.slug}` : `/view-story/${item.storyId}`;
              return (
                <Link
                  key={item.storyId}
                  href={isAuthLoaded && isSignedIn ? href : `/sign-in?redirect=${encodeURIComponent(href)}`}
                  prefetch={false}
                  className="rounded-lg border border-[#d8c69e]/20 bg-[#111d2b]/70 p-3 transition hover:border-[#d8c69e]/40"
                >
                  <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-900">
                    {item?.coverImage ? (
                      <Image
                        src={item.coverImage}
                        alt={item?.output?.title ?? "Related story cover"}
                        fill
                        sizes="(max-width: 768px) 100vw, 20vw"
                        className="object-cover"
                        unoptimized
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-[#c3cbd4]">
                    {item?.output?.title ?? "Untitled Story"}
                  </h3>
                </Link>
              );
            })}

            {relatedStories.length === 0 && <p className="col-span-full text-sm text-[#c3cbd4]/70">No related stories yet.</p>}
          </div>}
          </div>

          {relatedTotalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => changeRelatedPage(Math.max(1, relatedPage - 1))}
                disabled={relatedPage === 1 || relatedLoading}
                className="tc-btn-ghost px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              {getVisiblePageNumbers().map((pageNo) => (
                <button
                  key={`related-page-${pageNo}`}
                  onClick={() => changeRelatedPage(pageNo)}
                  disabled={relatedLoading}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    pageNo === relatedPage
                      ? "bg-[#d8c69e] text-[#101a28]"
                      : "border border-[#d8c69e]/30 bg-[#111d2b]/70 text-[#c3cbd4]"
                  }`}
                >
                  {pageNo}
                </button>
              ))}
              <button
                onClick={() => changeRelatedPage(Math.min(relatedTotalPages, relatedPage + 1))}
                disabled={
                  relatedPage === relatedTotalPages ||
                  relatedTotalPages === 0 ||
                  relatedLoading
                }
                className="tc-btn-ghost px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
