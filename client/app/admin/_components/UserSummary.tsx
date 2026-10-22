"use client";

import Image from "next/image";
import { useState } from "react";
import { Crown, KeyRound, UserRound } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

export type AdminUser = {
  id: string;
  userName: string | null;
  userEmail: string;
  userImage?: string | null;
  plan: "free" | "creator";
  storyCount: number;
  signInMethods?: string[];
};

export default function UserSummary({ user }: { user: AdminUser }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-[#d8c69e]/25 bg-[#172331] text-[#f1eadb] shadow-md">
    <div className={`flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-11 py-1.5 text-xs font-bold ${user.plan === "creator" ? "bg-[#d8c69e] text-[#101a28]" : "text-[#c3cbd4]"}`}>
      {user.plan === "creator" ? <><Crown size={14} className="shrink-0" aria-hidden="true" />Creator member</> : "Free trial"}
    </div>
    <div className="flex flex-1 flex-col px-3 pb-2 pt-2">
      <div className="flex min-h-12 items-center gap-2.5">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d8c69e]/25 bg-[#273340]">
        {user.userImage && failedImage !== user.userImage
          ? <Image src={user.userImage} alt="" fill sizes="40px" unoptimized className="object-cover" onError={() => setFailedImage(user.userImage ?? null)} />
          : <UserRound className="h-5 w-5 text-[#d8c69e]" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
      <h2 className="break-words text-sm font-bold leading-5">{user.userName || "Unnamed user"}</h2>
      <p className="break-all text-xs leading-4 text-[#c3cbd4]">{user.userEmail}</p>
      </div>
      </div>
      <div className="min-h-2 flex-1" />
      <div className="border-t border-[#d8c69e]/15 pt-2">
        <ul aria-label="Sign-in methods" className="flex min-h-8 flex-wrap content-center items-center gap-x-3 gap-y-1 text-xs">
          {user.signInMethods?.length ? user.signInMethods.map(provider => <li key={provider} className="inline-flex min-w-0 items-center gap-1.5">
            {provider === "google" ? <FcGoogle className="h-4 w-4 shrink-0" aria-hidden="true" /> : provider === "github" ? <FaGithub className="h-4 w-4 shrink-0" aria-hidden="true" /> : <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="break-all">{provider === "google" ? "Google" : provider === "github" ? "GitHub" : provider === "credential" ? "Email" : provider}</span>
          </li>) : <li className="text-[#c3cbd4]">Sign-in method not available</li>}
        </ul>
      </div>
    </div>
    <dl className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d8c69e]/20 bg-[#111d2b] px-3 py-2">
      <div className="flex flex-row-reverse items-baseline gap-1.5">
        <dt className="text-xs text-[#c3cbd4]">Stories</dt>
        <dd className="text-sm font-bold">{user.storyCount}</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt className="sr-only">Plan</dt>
        <dd className={`text-xs font-semibold ${user.plan === "creator" ? "text-[#d8c69e]" : "text-[#c3cbd4]"}`}>{user.plan === "creator" ? "Creator" : "Free trial"}</dd>
      </div>
    </dl>
  </div>;
}
