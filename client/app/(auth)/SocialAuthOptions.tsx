import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const socialButtonClass =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#d8c69e]/25 px-4 text-sm font-semibold text-[#f1eadb] transition-colors hover:bg-[#d8c69e]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c69e]";

export default function SocialAuthOptions() {
  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-[#c3cbd4]/50">
        <span className="h-px flex-1 bg-[#d8c69e]/20" />
        OR
        <span className="h-px flex-1 bg-[#d8c69e]/20" />
      </div>

      <div className="space-y-3">
        <a className={socialButtonClass} href="/auth/github">
          <FaGithub aria-hidden="true" className="size-5" />
          Continue with GitHub
        </a>
        <a className={socialButtonClass} href="/auth/google">
          <FcGoogle aria-hidden="true" className="size-5" />
          Continue with Google
        </a>
      </div>

      <p className="mt-4 rounded-md border border-[#d8c69e]/20 bg-[#d8c69e]/[0.08] px-3 py-2.5 text-sm leading-6 text-[#c3cbd4]/80 text-center">
        To generate content, continue with GitHub.
      </p>
    </div>
  );
}
