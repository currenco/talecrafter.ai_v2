"use client";

import { authHref } from "@/lib/auth-navigation";
import { useAuthDestination } from "@/lib/use-auth-destination";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const socialButtonClass =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#d8c69e]/25 px-4 text-sm font-semibold text-[#f1eadb] transition-colors hover:bg-[#d8c69e]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c69e]";

export default function SocialAuthOptions() {
  const destination = useAuthDestination();
  return (
    <div>
      <div className="my-3 flex items-center gap-3 text-xs text-[#c3cbd4]/50">
        <span className="h-px flex-1 bg-[#d8c69e]/20" />
        OR
        <span className="h-px flex-1 bg-[#d8c69e]/20" />
      </div>

      <div className="space-y-2">
        <a className={socialButtonClass} href={authHref("/auth/github", destination)}>
          <FaGithub aria-hidden="true" className="size-5" />
          Continue with GitHub
        </a>
        <a className={socialButtonClass} href={authHref("/auth/google", destination)}>
          <FcGoogle aria-hidden="true" className="size-5" />
          Continue with Google
        </a>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#c3cbd4]/80 text-center">
        Free trial creation requires a linked GitHub account; Creator supports either sign-in method.
      </p>
    </div>
  );
}
