"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, Crown, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import { userErrorMessage } from "@/lib/user-messages";
import StoryItemCard from "@/app/dashboard/_components/StoryItemCard";
import StoryGridSkeleton from "@/components/StoryGridSkeleton";
import shimmer from "@/components/StoryGridSkeleton.module.css";
import type { StoryItem } from "@/types/story";
import { UserDetailContext } from "@/app/_context/UserDetailContext";

type Profile = { user: { id: string; userName: string | null; userImage: string | null; storyCount: number; plan: "free" | "creator" }; items: StoryItem[]; pagination: { hasMore: boolean; totalCount: number }; preview: boolean };
const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn, isAuthLoaded } = useContext(UserDetailContext);
  const [data, setData] = useState<Profile | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const list = useRef<HTMLElement>(null);
  useEffect(() => { setOffset(0); setData(null); }, [id]);
  useEffect(() => {
    if (!isAuthLoaded) return;
    let active = true;
    setLoading(true); setError("");
    void (isSignedIn ? getAccessToken() : Promise.resolve(null)).then(token => apiFetch<Profile>(`/users/${encodeURIComponent(id)}/profile?limit=12&offset=${offset}`, { token }))
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(userErrorMessage(err, "We couldn't load this creator. Please try again.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, offset, retry, isSignedIn, isAuthLoaded]);
  const changePage = (next: number) => { setLoading(true); setOffset(next); list.current?.scrollTo({ top: 0 }); };
  return <main className="mx-auto max-w-6xl px-5 py-6 text-[#f1eadb] sm:px-8 lg:h-[calc(100dvh-88px)] lg:min-h-[420px]">
    <div className="grid gap-5 lg:h-full lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside>
        <Link href="/explore" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-[#d8c69e]"><ArrowLeft size={16} />Explore stories</Link>
        {data ? <div className={`overflow-hidden rounded-lg border bg-[#172331] text-center ${data.user.plan === "creator" ? "border-[#d8c69e] ring-1 ring-[#d8c69e]/20" : "border-[#d8c69e]/25"}`}>
          {data.user.plan === "creator" && <div className="flex items-center justify-center gap-2 bg-[#d8c69e] px-4 py-2 text-sm font-bold text-[#101a28]"><Crown size={17} aria-hidden="true" />Creator member</div>}
          <div className="px-5 py-7">
            <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#273340] text-[#d8c69e]">
              {data.user.userImage && failedAvatar !== data.user.userImage ? <Image src={data.user.userImage} alt="" fill sizes="80px" unoptimized className="object-cover" onError={() => setFailedAvatar(data.user.userImage)} /> : <UserRound size={36} />}
            </div>
            <h1 className="break-words text-xl font-bold">{data.user.userName || "Story creator"}</h1>
          </div>
          <p className="border-t border-[#d8c69e]/20 bg-[#111d2b] px-4 py-4 text-sm text-[#c3cbd4]"><strong className="mr-2 text-base text-[#f1eadb]">{data.user.storyCount}</strong>Published {data.user.storyCount === 1 ? "story" : "stories"}</p>
        </div> : loading && <div aria-label="Loading creator" className={`${shimmer.card} relative h-60 overflow-hidden rounded-lg bg-[#172331]`} />}
      </aside>
      {/* The independent scroll region must be keyboard focusable. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <section ref={list} tabIndex={0} aria-label="Published stories" className="min-w-0 lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pt-1 lg:[scrollbar-gutter:stable]">
        <StoryGridSkeleton isLoading={loading} count={12} className="" gridClassName={grid} />
        {!loading && error && <div role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-3 min-h-11 underline">Try again</button></div>}
        {!loading && !error && data && <>
          <div className={grid}>
            {data.items.map(story => <StoryItemCard key={story.id} story={story} readOnly requireSignIn={!isAuthLoaded || !isSignedIn} />)}
            {data.preview && data.pagination.hasMore && <Link href={`/sign-in?redirect=${encodeURIComponent(`/creators/${id}`)}`} className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-[#d8c69e]/30 bg-[#172331] text-[#d8c69e] transition-colors hover:border-[#d8c69e] hover:bg-[#202e3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d8c69e]">
              <span className="text-3xl font-bold">{Math.max(0, data.pagination.totalCount - offset - data.items.length)}+</span>
              <span className="text-sm font-semibold">more stories</span>
            </Link>}
          </div>
          {!data.items.length && <p className="py-12 text-center text-[#c3cbd4]">No published stories yet.</p>}
          {!data.preview && (offset > 0 || data.pagination.hasMore) && <nav aria-label="Story pages" className="flex items-center justify-center gap-4 py-6">
            <button aria-label="Previous page" disabled={!offset} onClick={() => changePage(Math.max(0, offset - 12))} className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 disabled:opacity-40"><ChevronLeft /></button>
            <span className="text-sm">{offset + 1}-{offset + data.items.length} of {data.pagination.totalCount}</span>
            <button aria-label="Next page" disabled={!data.pagination.hasMore} onClick={() => changePage(offset + 12)} className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 disabled:opacity-40"><ChevronRight /></button>
          </nav>}
        </>}
      </section>
    </div>
  </main>;
}
