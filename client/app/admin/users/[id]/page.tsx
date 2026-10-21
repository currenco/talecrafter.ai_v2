"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import { userErrorMessage } from "@/lib/user-messages";
import StoryGridSkeleton from "@/components/StoryGridSkeleton";
import StoryItemCard from "@/app/dashboard/_components/StoryItemCard";
import type { StoryItem } from "@/types/story";
import UserSummary, { type AdminUser } from "../../_components/UserSummary";

type LibraryStory = Omit<StoryItem, "userEmail" | "output"> & { title: string };
type Library = { user: AdminUser; items: LibraryStory[]; pagination: { totalCount: number; hasMore: boolean } };
const storyGridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

export default function AdminUserLibrary() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Library | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const storyListRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getAccessToken().then(token => apiFetch<Library>(`/admin/users/${encodeURIComponent(id)}/stories?limit=12&offset=${offset}`, { token }))
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(userErrorMessage(err, "We couldn't open this user's library. Please try again.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, offset, retry]);
  const changePage = (next: number) => { setLoading(true); setOffset(next); storyListRef.current?.scrollTo({ top: 0 }); };
  return <main className="mx-auto max-w-6xl px-5 py-6 text-[#f1eadb] sm:px-8 lg:flex lg:h-[calc(100dvh-88px)] lg:min-h-[420px] lg:flex-col lg:overflow-hidden">
    <div className="grid items-start gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[230px_minmax(0,1fr)]">
    <aside aria-label="User details" className="min-w-0">
      <Link href="/admin?tab=users" className="inline-flex min-h-11 items-center gap-2 text-sm text-emerald-200"><ArrowLeft className="h-4 w-4" />All users</Link>
      <h1 className="mb-5 mt-3 break-words text-xl font-semibold">{data?.user.userName ? `${data.user.userName}'s stories` : "User stories"}</h1>
      {data && <UserSummary user={data.user} />}
    </aside>
    {/* Keyboard users need to focus the independently scrolling story panel. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
    <section ref={storyListRef} tabIndex={0} aria-label="User stories" className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-200 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-2 lg:pt-1 lg:[scrollbar-gutter:stable]">
    <StoryGridSkeleton isLoading={loading} count={12} className="" gridClassName={storyGridClassName} />
    {error && !loading && <div role="alert" className="py-6"><p>{error}</p><button className="mt-3 min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
    {!loading && !error && data && <>
      {!data.items.length && <p className="py-12 text-center text-[#c3cbd4]">No stories on this page.</p>}
      <div className={storyGridClassName}>{data.items.map(story => (
        <StoryItemCard key={story.id} readOnly story={{ ...story, userEmail: data.user.userEmail, output: { title: story.title || "Untitled story" } }} />
      ))}</div>
      <nav aria-label="User story pages" className="mt-8 flex items-center justify-center gap-4 text-sm">
        <button title="Previous page" aria-label="Previous page" disabled={!offset} onClick={() => changePage(Math.max(0, offset - 12))} className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 disabled:opacity-40"><ChevronLeft /></button>
        <span>{data.pagination.totalCount ? `${offset + 1}-${offset + data.items.length} of ${data.pagination.totalCount}` : "0 stories"}</span>
        <button title="Next page" aria-label="Next page" disabled={!data.pagination.hasMore} onClick={() => changePage(offset + 12)} className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 disabled:opacity-40"><ChevronRight /></button>
      </nav>
    </>}
    </section>
    </div>
  </main>;
}
