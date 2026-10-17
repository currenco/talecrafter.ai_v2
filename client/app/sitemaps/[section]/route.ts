import { fetchSitemapPage, sitemapUnavailable, staticSitemapXml, storySitemapXml, xmlResponse } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "pages.xml") return xmlResponse(staticSitemapXml());
  const match = /^stories-(0|[1-9]\d*)\.xml$/.exec(section);
  if (!match || Number(match[1]) > 100000) return new Response("Not found", { status: 404 });
  try {
    const page = Number(match[1]);
    const data = await fetchSitemapPage(page);
    if (page >= Math.ceil(data.totalCount / data.pageSize)) return new Response("Not found", { status: 404 });
    return xmlResponse(storySitemapXml(data));
  } catch (error) {
    console.error("Story sitemap unavailable", error);
    return sitemapUnavailable();
  }
}
