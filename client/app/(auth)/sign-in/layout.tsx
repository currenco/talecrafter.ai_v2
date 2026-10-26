import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to your TaleCrafter AI account to create and manage your stories.",
  path: "/sign-in",
  index: false,
});

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
