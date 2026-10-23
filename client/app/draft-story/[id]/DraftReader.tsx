"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { Info, LoaderCircle, RefreshCw } from "lucide-react";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import StoryPageClient from "@/app/story/[slug]/StoryPageClient";
import StoryReaderSkeleton from "@/components/StoryReaderSkeleton";
import { apiFetch, createIdempotencyKey } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import { apiErrorMessage, userErrorMessage } from "@/lib/user-messages";
import type { StoryRecord } from "@/lib/story-data";
import { streamStoryProgress, type StoryGenerationStatus } from "@/lib/story-generation";
import { PollinationsUpgradeNotice, usePollinationsUpgrade } from "@/components/PollinationsUpgrade";

export default function DraftReader({ storyId }: { storyId: string }) {
  const { isAuthLoaded, isSignedIn, userDetail } = useContext(UserDetailContext);
  const [progress, setProgress] = useState<StoryGenerationStatus>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [resuming, setResuming] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { handleFundingError, upgradeDialog } = usePollinationsUpgrade();

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn) return;
    let cancelled = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (cancelled) return;
      try {
        const token = await getAccessToken();
        if (cancelled) return;
        await streamStoryProgress({ storyId, token, signal: controller.signal, onProgress: next => {
          if (!cancelled) { setProgress(next); setError(""); }
        } });
      } catch (failure) {
        if (!cancelled) setError(userErrorMessage(failure, "Live image updates were interrupted. Your saved story is still here."));
      }
    };
    void refresh();
    return () => { cancelled = true; controller.abort(); };
  }, [storyId, isAuthLoaded, isSignedIn, attempt]);

  const resume = async () => {
    setDetailsOpen(false);
    setResuming(true);
    try {
      await apiFetch(`/stories/${encodeURIComponent(storyId)}/resume`, { method: "POST", token: await getAccessToken(), idempotencyKey: createIdempotencyKey() });
      setProgress(previous => previous ? { ...previous, generationStatus: "running", errorCode: null, errorMessage: null } : previous);
      setAttempt(value => value + 1);
    } catch (failure) {
      if (!handleFundingError(failure)) setError(userErrorMessage(failure));
    } finally { setResuming(false); }
  };

  if (!isAuthLoaded) return <StoryReaderSkeleton />;
  if (!isSignedIn) return <div className="p-6"><Link href={`/sign-in?redirect=${encodeURIComponent(`/draft-story/${storyId}`)}`}>Sign in to open your story</Link></div>;
  const published = progress?.status === "published";
  const running = progress?.generationStatus === "running";
  const exhausted = progress?.errorCode === "POLLINATIONS_BALANCE_EXHAUSTED" && userDetail?.plan !== "creator";
  const story: StoryRecord | undefined = progress ? { id: 0, storySubject: null, storyType: null, ageGroup: null, imageStyle: null, userName: null, userImage: null, ...progress.content } : undefined;

  const notice = !published && progress ? (
    <div className="mt-4 flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-[#d8c69e]/15 pt-3 text-xs text-[#c3cbd4] sm:text-sm">
      <span role="status" className="inline-flex items-center gap-2">
        {running && !error ? <LoaderCircle size={15} className="shrink-0 animate-spin motion-reduce:animate-none text-[#d8c69e]" aria-hidden="true" /> : <Info size={15} className="shrink-0 text-[#d8c69e]" aria-hidden="true" />}
        {error ? "Live updates paused" : running ? "Creating illustrations" : "Illustrations paused"}
        <span className="whitespace-nowrap tabular-nums text-[#c3cbd4]/65">{progress.completedImages}/{progress.totalImages} ready</span>
      </span>
      {(!running || error) && <Button size="sm" variant="light" onPress={() => setDetailsOpen(true)} className="h-9 min-w-0 px-2 text-xs font-medium text-[#d8c69e] sm:text-sm">View options</Button>}
    </div>
  ) : undefined;

  return <>
    {upgradeDialog}
    <Modal isOpen={detailsOpen} onOpenChange={setDetailsOpen} placement="center" className="rounded-lg border border-[#d8c69e]/25 bg-[#111d2b] text-[#f1eadb]">
      <ModalContent>
        <ModalHeader className="text-lg">{exhausted ? "Continue your illustrations" : "Illustration progress"}</ModalHeader>
        <ModalBody className="text-sm leading-6 text-[#c3cbd4]">
          {exhausted ? <PollinationsUpgradeNotice /> : <p>{error || (progress?.errorMessage ? apiErrorMessage(progress.errorMessage, 502, progress.errorCode ?? undefined) : "Your story is saved. You can keep reading while the remaining illustrations are completed.")}</p>}
        </ModalBody>
        <ModalFooter className="flex-wrap">
          <Button variant="light" onPress={() => setDetailsOpen(false)}>Keep reading</Button>
          {!exhausted && (error ? <Button startContent={<RefreshCw size={16} />} onPress={() => { setDetailsOpen(false); setAttempt(value => value + 1); }} className="h-11 bg-[#d8c69e] text-[#0b1522]">Reconnect updates</Button> : !running && !published ? <Button isLoading={resuming} startContent={!resuming && <RefreshCw size={16} />} onPress={resume} className="h-11 bg-[#d8c69e] text-[#0b1522]">Resume illustrations</Button> : null)}
        </ModalFooter>
      </ModalContent>
    </Modal>
    {story ? <StoryPageClient initialStory={story} isDraft={!published} generationNotice={notice} /> : !error ? <StoryReaderSkeleton /> : <div className="mx-auto max-w-xl px-5 py-8 text-center text-sm text-[#c3cbd4]">
      <p role="alert">{error}</p>
      {error && <Button variant="light" startContent={<RefreshCw size={16} />} onPress={() => setAttempt(value => value + 1)} className="mt-3 text-[#d8c69e]">Try again</Button>}
    </div>}
  </>;
}
