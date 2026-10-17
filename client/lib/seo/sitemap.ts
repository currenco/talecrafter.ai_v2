import { absoluteUrl, PUBLIC_PAGES, SITE_URL } from "./config";

type SitemapPage = {
  items: { slug: string; updatedAt: string | null }[];
  totalCount: number;
  pageSize: number;
};

export async function fetchSitemapPage(page = 0): Promise<SitemapPage> {
  const base = (process.env.API_BASE_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");
  const response = await fetch(`${base}/stories/sitemap?page=${page}`, {
    next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Sitemap API returned ${response.status}`);
  const { data } = await response.json();
  if (!data || !Array.isArray(data.items) || !Number.isInteger(data.totalCount) || data.totalCount < 0 || data.pageSize !== 1000) {
    throw new Error("Invalid sitemap API response");
  }
  return data;
}

const xmlEscape = (value: string) => value.replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';

export function sitemapIndex(totalCount: number, pageSize: number) {
  const paths = ["/sitemaps/pages.xml", ...Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, page) => `/sitemaps/stories-${page}.xml`)];
  return `${xmlHeader}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<sitemap><loc>${xmlEscape(`${SITE_URL}${path}`)}</loc></sitemap>`).join("")}</sitemapindex>`;
}

export function sitemapXml(entries: { url: string; updatedAt?: string | null }[]) {
  return `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(entry => {
    const date = entry.updatedAt ? new Date(entry.updatedAt) : null;
    const modified = date && Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : "";
    return `<url><loc>${xmlEscape(entry.url)}</loc>${modified}</url>`;
  }).join("")}</urlset>`;
}

export const staticSitemapXml = () => sitemapXml(PUBLIC_PAGES.map(page => ({ url: absoluteUrl(page.path) })));
export const storySitemapXml = (data: SitemapPage) => sitemapXml(data.items.map(item => ({ url: absoluteUrl(`/story/${encodeURIComponent(item.slug)}`), updatedAt: item.updatedAt })));
export const xmlResponse = (xml: string) => new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } });
export const sitemapUnavailable = () => new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "300", "Cache-Control": "no-store" } });
