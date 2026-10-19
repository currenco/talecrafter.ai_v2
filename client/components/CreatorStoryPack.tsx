"use client";

import { useContext, useRef, useState } from "react";
import { Download, LockKeyhole } from "lucide-react";
import { toast } from "react-toastify";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import { userErrorMessage } from "@/lib/user-messages";
import type { CharacterBiblePack } from "@/lib/character-bible-content";

export default function CreatorStoryPack({ storyId }: { storyId: string | null }) {
  const { userDetail } = useContext(UserDetailContext);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const download = async () => {
    if (!storyId || !userDetail?.canExport || busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const pack = await apiFetch<CharacterBiblePack>(`/stories/${encodeURIComponent(storyId)}/creator-pack`, { token: await getAccessToken() });
      if (!Object.keys(pack.characters ?? {}).length) {
        toast.info("The character bible for this story isn't ready yet. Please try again later.");
        return;
      }
      const { downloadCharacterBible } = await import("@/lib/character-bible-pdf");
      const result = await downloadCharacterBible(pack);
      if (result === "print") toast.info("Choose Save as PDF in the print dialog to save your character bible.");
      else toast.success("Character bible download started.");
    } catch (error) {
      toast.error(userErrorMessage(error, "We couldn't download the character bible. Please try again."));
    } finally { busy.current = false; setPending(false); }
  };
  return <button onClick={() => void download()} disabled={pending || !storyId || !userDetail?.canExport}
    title={!userDetail?.canExport ? "Creator subscription required" : undefined}
    className="tc-btn-ghost inline-flex max-w-full items-center gap-2 px-5 py-2 text-sm disabled:cursor-not-allowed">
    {userDetail?.canExport ? <Download size={18} className="shrink-0" aria-hidden="true" /> : <LockKeyhole size={18} className="shrink-0" aria-hidden="true" />}
    {pending ? "Preparing character bible..." : "Download character bible"}
  </button>;
}
