import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[65svh] flex-col items-center justify-center bg-[#0b1522] px-5 py-10 text-center text-[#f1eadb] sm:py-14">
      <div aria-hidden="true" className="relative mb-6 flex h-52 w-full max-w-[420px] items-center justify-center sm:h-60">
        <span className="select-none text-[128px] font-extrabold leading-none text-[#d8c69e]/15 sm:text-[176px]">404</span>
        <Image
          src="/decor/story-inkwell-quill.webp"
          alt=""
          width={720}
          height={720}
          priority
          sizes="(max-width: 639px) 208px, 240px"
          className="absolute inset-y-0 left-1/2 h-full w-auto -translate-x-1/2 object-contain"
        />
      </div>
      <p className="text-xs font-semibold uppercase text-[#d8c69e]">404 / Page not found</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">This page is unwritten.</h1>
      <p className="mt-4 max-w-md text-sm leading-7 text-[#c3cbd4] sm:text-base">
        The page may have moved, or the link might be incomplete.
        There are still plenty of stories to discover.
      </p>
      <nav aria-label="Page recovery" className="mt-7 flex w-full max-w-sm flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
        <Link href="/explore" className="tc-btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-6 py-3 text-sm">
          <Compass size={18} aria-hidden="true" />
          Explore stories
        </Link>
        <Link href="/" className="tc-btn-ghost inline-flex min-h-11 items-center justify-center gap-2 px-6 py-3 text-sm">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to home
        </Link>
      </nav>
    </main>
  );
}
