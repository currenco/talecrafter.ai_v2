import ExploreClient from "./ExploreClient";
import { publicPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const filtered = ["genre", "offset", "page"].some(key => Boolean(query[key]));
  return {
    ...publicPageMetadata("/explore"),
    robots: { index: !filtered, follow: true },
  };
}

export default function ExplorePage() {
  return <ExploreClient />;
}
