import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { Stories } from '../db/schema.js';

export const SITEMAP_PAGE_SIZE = 1000;

export const listSitemapStories = async (page = 0) => {
  const published = and(
    eq(Stories.status, 'published'),
    sql`trim(${Stories.slug}) <> ''`
  );
  const [total] = await db
    .select({ count: sql`count(*)::int` })
    .from(Stories)
    .where(published);
  const items = await db
    .select({ slug: Stories.slug, updatedAt: Stories.updatedAt })
    .from(Stories)
    .where(published)
    .orderBy(asc(Stories.id))
    .limit(SITEMAP_PAGE_SIZE)
    .offset(page * SITEMAP_PAGE_SIZE);
  return { items, totalCount: total.count, pageSize: SITEMAP_PAGE_SIZE };
};
