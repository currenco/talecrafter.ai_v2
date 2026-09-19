import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  CreditAccounts,
  Stories,
  StoryVersions,
  UserProfiles,
} from '../db/schema.js';
import ApiError from '../utils/ApiError.js';

export const listAdminStories = async () =>
  db
    .select({
      id: Stories.id,
      storyId: Stories.storyId,
      slug: Stories.slug,
      storySubject: Stories.storySubject,
      storyType: Stories.storyType,
      ageGroup: Stories.ageGroup,
      imageStyle: Stories.imageStyle,
      coverImage: Stories.coverImage,
      output: StoryVersions.output,
      userName: UserProfiles.userName,
      userImage: UserProfiles.userImage,
      userEmail: UserProfiles.userEmail,
    })
    .from(Stories)
    .innerJoin(UserProfiles, eq(UserProfiles.id, Stories.ownerId))
    .innerJoin(
      StoryVersions,
      and(eq(StoryVersions.storyId, Stories.id), eq(StoryVersions.version, 1))
    )
    .orderBy(asc(Stories.createdAt));

export const listAdminUsers = async () =>
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
    .orderBy(desc(UserProfiles.createdAt));

export const deleteAdminStory = async storyId => {
  const safeStoryId = String(storyId ?? '').trim();
  if (!safeStoryId) throw new ApiError(400, 'Story ID is required');

  const [deleted] = await db
    .delete(Stories)
    .where(eq(Stories.storyId, safeStoryId))
    .returning({ storyId: Stories.storyId });

  if (!deleted) throw new ApiError(404, 'Story not found');
  return deleted;
};

export const deleteAdminUser = async userEmail => {
  const safeEmail = String(userEmail ?? '')
    .trim()
    .toLowerCase();
  if (!safeEmail) throw new ApiError(400, 'User email is required');

  const [deleted] = await db
    .delete(UserProfiles)
    .where(eq(UserProfiles.userEmail, safeEmail))
    .returning({ userEmail: UserProfiles.userEmail });

  if (!deleted) throw new ApiError(404, 'User not found');
  return deleted;
};

export const updateAdminUserCredit = async ({ userEmail, credit }) => {
  const safeEmail = String(userEmail ?? '')
    .trim()
    .toLowerCase();
  const safeCredit = Number(credit);
  if (!safeEmail) throw new ApiError(400, 'User email is required');
  if (!Number.isInteger(safeCredit) || safeCredit < 0) {
    throw new ApiError(400, 'Credit must be a non-negative integer');
  }

  const key = `admin-adjustment:${randomUUID()}`;
  const result = await db.execute(sql`
    WITH target AS (
      SELECT profile.id, account.id AS account_id, account.balance
      FROM app.user_profiles profile
      INNER JOIN app.credit_accounts account ON account.user_id = profile.id
      WHERE lower(profile.email) = ${safeEmail}
      ORDER BY profile.created_at DESC
      LIMIT 1
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
