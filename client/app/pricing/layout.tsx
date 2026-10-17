import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata("/pricing");
export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
