"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/neon-auth/client";
import type { StoryChapter } from "@/types/story";
import { userErrorMessage } from "@/lib/user-messages";

export default function CreatorStoryPack({ storyId }: { storyId: string | null }) {
  const { userDetail } = useContext(UserDetailContext);
  const [pack, setPack] = useState<{ characters: Record<string, unknown>; scenes: StoryChapter[] }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setPending(true);
    setError("");
    try {
      setPack(await apiFetch(`/stories/${encodeURIComponent(storyId ?? "")}/creator-pack`, { token: await getAccessToken() }));
    } catch (error) { setError(userErrorMessage(error, "We couldn't load the characters and scene prompts. Please try again.")); }
    finally { setPending(false); }
  };
  return (
    <section className="mx-auto my-10 max-w-5xl border-t border-white/20 px-5 py-8 text-[#f1eadb]">
      <h2 className="text-2xl font-semibold">Character bible and scene prompts</h2>
      {!userDetail?.canExport ? <Link className="mt-4 inline-block underline" href="/pricing#creator">View Creator plan</Link> :
        <button onClick={() => void load()} disabled={pending || !storyId} className="mt-4 rounded-md border border-white/30 px-4 py-3 disabled:opacity-50">{pending ? "Loading..." : "Open story pack"}</button>}
      {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
      {pack && userDetail?.canExport && <div className="mt-6 space-y-8">
        <div>
          <h3 className="text-lg font-semibold">Characters</h3>
          {Object.entries(pack.characters).map(([name, description]) => <div key={name} className="mt-4">
            <h4 className="font-semibold">{name}</h4>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{typeof description === "string" ? description : JSON.stringify(description, null, 2)}</p>
          </div>)}
          {!Object.keys(pack.characters).length && <p className="mt-3 text-sm">This older story has no character bible.</p>}
        </div>
        <div>
          <h3 className="text-lg font-semibold">Scenes</h3>
          {pack.scenes.map((scene, index) => <details key={index} className="mt-4 border-b border-white/15 pb-4">
            <summary className="cursor-pointer font-semibold">{scene.title || `Scene ${index + 1}`}</summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{scene.textPrompt}</p>
            <h4 className="mt-4 font-semibold">Image prompt</h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{scene.imagePrompt || "No saved image prompt."}</p>
          </details>)}
        </div>
      </div>}
    </section>
  );
}
