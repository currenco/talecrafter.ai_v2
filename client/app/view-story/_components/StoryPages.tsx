import { useState } from "react";
import { IoPlayCircle, IoPauseCircle } from "react-icons/io5";
import Image from "next/image";
import { buildPollinationsImageUrl } from "@/lib/story-images";
import type { StoryChapter } from "@/types/story";
import { getCleanChapterText } from "@/lib/story-text";

type StoryPagesProps = {
  storyChapter: StoryChapter;
  pendingImage?: boolean;
  chapterKey: number;
  activeNarrationKey?: number | null;
  narrationPaused?: boolean;
  onToggleNarration?: (chapterKey: number) => void;
};

const StoryPages = ({
  storyChapter,
  pendingImage = false,
  chapterKey,
  activeNarrationKey,
  narrationPaused = false,
  onToggleNarration,
}: StoryPagesProps) => {
  const isPlaying = activeNarrationKey === chapterKey && !narrationPaused;
  const [imageLoaded, setImageLoaded] = useState(false); // Track image loading state
  const [imageError, setImageError] = useState(false);

  const chapterImageSrc =
    storyChapter?.imageUrl ||
    buildPollinationsImageUrl(storyChapter?.imagePrompt ?? storyChapter?.title ?? "Story illustration", {
      seed: 0,
    });

  return (
    <div className="grid h-full min-h-0 grid-rows-[3.5rem_minmax(0,1.4fr)_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="flex min-h-0 items-center gap-3">
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Long titles need keyboard scrolling within the fixed heading area. */}
        <h2 tabIndex={0} className="hsb2 max-h-full min-w-0 flex-1 overflow-y-auto break-words text-lg font-bold leading-7 text-blue-700 md:text-xl">{storyChapter?.title}</h2>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-3xl text-blue-700 transition hover:bg-blue-200"
          onClick={() => onToggleNarration?.(chapterKey)}
          aria-label={isPlaying ? "Pause narration" : activeNarrationKey === chapterKey ? "Resume narration" : "Play narration"}
        >
          {isPlaying ? <IoPauseCircle /> : <IoPlayCircle />}
        </button>
      </div>
      <div className="relative min-h-0 w-full overflow-hidden rounded-lg">
        {!pendingImage && !imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-blue-50">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></span>
          </div>
        )}
        {pendingImage ? <div className="flex h-full items-center justify-center rounded-lg bg-blue-50 px-6 text-center text-sm text-slate-600">Illustration pending. You can read this page now.</div> : imageError ? (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-blue-200/40 bg-blue-50 px-6 text-center text-sm text-slate-600">
            We couldn’t load this illustration right now. You can still continue reading this page.
          </div>
        ) : (
          <Image
            src={chapterImageSrc}
            alt={storyChapter?.title ?? "story chapter illustration"}
            className={`rounded-lg bg-transparent object-cover transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The scrollable reading area must be reachable by keyboard. */}
      <div tabIndex={0} role="region" aria-label="Page text" className="hsb2 min-h-0 overflow-y-auto rounded-lg bg-blue-50 p-4 [scrollbar-gutter:stable]">
        <p className="break-words text-lg leading-7 text-slate-800 md:text-xl md:leading-8">
          {getCleanChapterText(storyChapter)}
        </p>
      </div>
    </div>
  );
};

export default StoryPages;
