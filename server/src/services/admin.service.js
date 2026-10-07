import { randomUUID } from 'node:crypto';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  CreditAccounts,
  Payments,
  Stories,
  UserProfiles,
} from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import {
  createPaginatedResult,
  normalizePagination,
} from '../utils/pagination.js';
import { deleteStoryAssets, deleteUserAssets } from './asset.service.js';

export const listAdminStories = async query => {
  const { limit, offset } = normalizePagination(query);
  const [items, aggregateRows, storyTypeRows] = await Promise.all([
    db
      .select({
        id: Stories.id,
        storyId: Stories.storyId,
        slug: Stories.slug,
        title: Stories.title,
        storySubject: Stories.storySubject,
        storyType: Stories.storyType,
        ageGroup: Stories.ageGroup,
        imageStyle: Stories.imageStyle,
        coverImage: Stories.coverImage,
        userName: UserProfiles.userName,
        userImage: UserProfiles.userImage,
        userEmail: UserProfiles.userEmail,
      })
      .from(Stories)
      .innerJoin(UserProfiles, eq(UserProfiles.id, Stories.ownerId))
      .orderBy(desc(Stories.createdAt), desc(Stories.id))
      .limit(limit)
      .offset(offset),
    db.select({ totalCount: sql`count(*)` }).from(Stories),
    db
      .selectDistinct({ storyType: Stories.storyType })
      .from(Stories)
      .orderBy(asc(Stories.storyType)),
  ]);

  return {
    ...createPaginatedResult({
      items,
      limit,
      offset,
      totalCount: aggregateRows[0]?.totalCount,
    }),
    summary: {
      storyTypes: storyTypeRows.map(row => row.storyType).filter(Boolean),
    },
  };
};

export const listAdminUsers = async query => {
  const { limit, offset } = normalizePagination(query);
  const [items, aggregateRows] = await Promise.all([
    db
      .select({
        id: UserProfiles.id,
        userEmail: UserProfiles.userEmail,
        userName: UserProfiles.userName,
        userImage: UserProfiles.userImage,
        role: UserProfiles.role,
        credit: CreditAccounts.balance,
      })
      .from(UserProfiles)
      .innerJoin(CreditAccounts, eq(CreditAccounts.userId, UserProfiles.id))
      .orderBy(desc(UserProfiles.createdAt), desc(UserProfiles.id))
      .limit(limit)
      .offset(offset),
    db
      .select({
        totalCount: sql`count(*)`,
        totalCredits: sql`coalesce(sum(${CreditAccounts.balance}), 0)`,
      })
      .from(UserProfiles)
      .innerJoin(CreditAccounts, eq(CreditAccounts.userId, UserProfiles.id)),
  ]);

  return {
    ...createPaginatedResult({
      items,
      limit,
      offset,
      totalCount: aggregateRows[0]?.totalCount,
    }),
    summary: {
      totalCredits: Number(aggregateRows[0]?.totalCredits ?? 0),
    },
  };
};

export const deleteAdminStory = async storyId => {
  const safeStoryId = String(storyId ?? '').trim();
  if (!safeStoryId) throw new ApiError(400, 'Story ID is required');

  const [story] = await db
    .select({ id: Stories.id })
    .from(Stories)
    .where(eq(Stories.storyId, safeStoryId))
    .limit(1);

  if (!story) throw new ApiError(404, 'Story not found');

  await deleteStoryAssets(story.id);
  const [deleted] = await db
    .delete(Stories)
    .where(eq(Stories.id, story.id))
    .returning({ storyId: Stories.storyId });

  return deleted;
};

export const deleteAdminUser = async userId => {
  const safeUserId = String(userId ?? '').trim();
  if (!safeUserId) throw new ApiError(400, 'User ID is required');

  const [user] = await db
    .select({ id: UserProfiles.id })
    .from(UserProfiles)
    .where(eq(UserProfiles.id, safeUserId))
    .limit(1);
  if (!user) throw new ApiError(404, 'User not found');

  const [payment] = await db
    .select({ id: Payments.id })
    .from(Payments)
    .where(eq(Payments.userId, safeUserId))
    .limit(1);
  if (payment) {
    throw new ApiError(409, 'Users with payment history cannot be deleted');
  }

  await deleteUserAssets(safeUserId);
  const [deleted] = await db
    .delete(UserProfiles)
    .where(eq(UserProfiles.id, safeUserId))
    .returning({ id: UserProfiles.id });

  return deleted;
};

export const updateAdminUserCredit = async ({ userId, credit }) => {
  const safeUserId = String(userId ?? '').trim();
  const safeCredit = Number(credit);
  if (!safeUserId) throw new ApiError(400, 'User ID is required');
  if (!Number.isInteger(safeCredit) || safeCredit < 0) {
    throw new ApiError(400, 'Credit must be a non-negative integer');
  }

  const key = `admin-adjustment:${randomUUID()}`;
  const result = await db.execute(sql`
    WITH target AS (
      SELECT profile.id, account.id AS account_id, account.balance
      FROM app.user_profiles profile
      INNER JOIN app.credit_accounts account ON account.user_id = profile.id
      WHERE profile.id = ${safeUserId}
    ), updated AS (
      UPDATE app.credit_accounts account
      SET balance = ${safeCredit}, updated_at = now()
      FROM target
      WHERE account.id = target.account_id
      RETURNING account.id, account.user_id, account.balance,
        account.balance - target.balance AS amount
    ), recorded AS (
      INSERT INTO app.credit_ledger (
        account_id, amount, balance_after, reason, idempotency_key
      )
      SELECT id, amount, balance, 'admin_adjustment', ${key}
      FROM updated
      WHERE amount <> 0
    )
    SELECT
      profile.id,
      profile.email AS "userEmail",
      profile.display_name AS "userName",
      profile.avatar_url AS "userImage",
      profile.role,
      updated.balance AS credit
    FROM updated
    INNER JOIN app.user_profiles profile ON profile.id = updated.user_id
  `);

  const user = result.rows?.[0];
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

export const backfillStorySlugs = async () => ({
  scanned: 0,
  updated: 0,
  remaining: 0,
});
