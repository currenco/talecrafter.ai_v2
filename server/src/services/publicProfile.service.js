import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { CreatorSubscriptions, Stories, UserProfiles } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import {
  createPaginatedResult,
  normalizePagination,
} from '../utils/pagination.js';

export const getPublicProfile = async (userId, query, preview = false) => {
  const [user] = await db
    .select({
      id: UserProfiles.id,
      userName: UserProfiles.userName,
      userImage: UserProfiles.userImage,
      plan: sql`CASE WHEN ${CreatorSubscriptions.paidThrough} > now() AND ${CreatorSubscriptions.periodStart} <= now() AND NOT ${CreatorSubscriptions.revoked} THEN 'creator' ELSE 'free' END`,
    })
    .from(UserProfiles)
    .leftJoin(
      CreatorSubscriptions,
      eq(CreatorSubscriptions.userId, UserProfiles.id)
    )
    .where(eq(UserProfiles.id, userId))
    .limit(1);
  if (!user) throw new ApiError(404, 'Creator not found');
  const filter = and(
    eq(Stories.ownerId, userId),
    eq(Stories.status, 'published')
  );
  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(Stories)
    .where(filter);
  const { limit: requestedLimit, offset } = normalizePagination(query);
  const limit = preview
    ? Math.min(requestedLimit, Math.max(0, 8 - offset))
    : requestedLimit;
  const rows = limit
    ? await db
        .select({
          id: Stories.id,
          storyId: Stories.storyId,
          slug: Stories.slug,
          title: Stories.title,
          coverImage: Stories.coverImage,
          kind: Stories.kind,
          status: Stories.status,
        })
        .from(Stories)
        .where(filter)
        .orderBy(desc(Stories.createdAt), desc(Stories.id))
        .limit(limit)
        .offset(offset)
    : [];
  const items = rows.map(({ title, ...story }) => ({
    ...story,
    output: { title },
  }));
  return {
    user: { ...user, storyCount: count },
    ...createPaginatedResult({ items, limit, offset, totalCount: count }),
    preview,
  };
};
