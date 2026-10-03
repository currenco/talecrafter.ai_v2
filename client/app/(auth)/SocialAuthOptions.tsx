import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const socialButtonClass =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-blue-300/25 px-4 text-sm font-semibold transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

export default function SocialAuthOptions() {
  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-blue-100/50">
        <span className="h-px flex-1 bg-blue-300/20" />
        OR
        <span className="h-px flex-1 bg-blue-300/20" />
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

      <p className="mt-4 rounded-md border border-blue-300/20 bg-blue-400/10 px-3 py-2.5 text-sm leading-6 text-blue-100/80">
        To generate content, continue with GitHub. Connect your Pollinations
        key on the Create Story page.
      </p>
    </div>
  );
}
