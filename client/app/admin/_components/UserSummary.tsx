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
    <div className="flex flex-1 flex-col px-3 pb-3 pt-2 text-center">
      <span className="relative mx-auto mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#d8c69e]/25 bg-[#273340] shadow-sm">
        {user.userImage && failedImage !== user.userImage
          ? <Image src={user.userImage} alt="" fill sizes="56px" unoptimized className="object-cover" onError={() => setFailedImage(user.userImage ?? null)} />
          : <UserRound className="h-7 w-7 text-[#d8c69e]" aria-hidden="true" />}
      </span>
      <h2 className="break-words text-sm font-bold leading-5">{user.userName || "Unnamed user"}</h2>
      <p className="mt-1 break-all text-xs leading-4 text-[#c3cbd4]">{user.userEmail}</p>
      <div className="flex-1 min-h-3" />
      <div className="border-t border-[#d8c69e]/15 pt-2">
        <p className="text-xs text-[#c3cbd4]">Sign-in methods</p>
        <ul className="mt-1 flex min-h-10 flex-wrap content-start items-center justify-center gap-x-3 gap-y-1 text-xs">
          {user.signInMethods?.length ? user.signInMethods.map(provider => <li key={provider} className="inline-flex min-w-0 items-center gap-1.5">
            {provider === "google" ? <FcGoogle className="h-4 w-4 shrink-0" aria-hidden="true" /> : provider === "github" ? <FaGithub className="h-4 w-4 shrink-0" aria-hidden="true" /> : <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="break-all">{provider === "google" ? "Google" : provider === "github" ? "GitHub" : provider === "credential" ? "Email & password" : provider}</span>
          </li>) : <li className="text-[#c3cbd4]">Not available</li>}
        </ul>
      </div>
    </div>
    <dl className="grid grid-cols-2 border-t border-[#d8c69e]/20 bg-[#111d2b] px-3 py-2.5 text-center">
      <div className="flex flex-col-reverse gap-1 border-r border-[#d8c69e]/20 px-2">
        <dt className="text-xs text-[#c3cbd4]">Stories</dt>
        <dd className="text-base font-bold">{user.storyCount}</dd>
      </div>
      <div className="flex flex-col-reverse gap-1 px-2">
        <dt className="text-xs text-[#c3cbd4]">Plan</dt>
        <dd className={`text-base font-bold ${user.plan === "creator" ? "text-[#d8c69e]" : ""}`}>{user.plan === "creator" ? "Creator" : "Free trial"}</dd>
      </div>
    </dl>
  </div>;
}
