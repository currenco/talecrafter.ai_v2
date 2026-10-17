import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata("/about");
export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
