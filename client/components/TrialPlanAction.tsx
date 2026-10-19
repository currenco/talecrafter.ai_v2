"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useContext } from "react";
import { UserDetailContext } from "@/app/_context/UserDetailContext";
import { authHref } from "@/lib/auth-navigation";

export default function TrialPlanAction() {
  const { isAuthLoaded, isSignedIn } = useContext(UserDetailContext);
  const className = "flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/30 px-4 py-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";
  if (!isAuthLoaded) return <div className={`${className} animate-pulse`} role="status" aria-label="Checking your account"><span className="h-4 w-24 rounded bg-white/10" /></div>;
  return <Link className={className} href={isSignedIn ? "/create-story" : authHref("/sign-up", "/create-story")}>
    {isSignedIn ? "Create a story" : "Start free trial"}<ArrowRight size={16} aria-hidden="true" />
  </Link>;
}
