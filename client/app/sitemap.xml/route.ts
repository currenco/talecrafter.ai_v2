import { fetchSitemapPage, sitemapIndex, sitemapUnavailable, xmlResponse } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { totalCount, pageSize } = await fetchSitemapPage();
    return xmlResponse(sitemapIndex(totalCount, pageSize));
  } catch (error) {
    console.error("Sitemap index unavailable", error);
    return sitemapUnavailable();
  }
}
