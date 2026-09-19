import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { CreditAccounts, UserProfiles } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';

const selectUserByAuthId = async authUserId => {
  const rows = await db
    .select({
      id: UserProfiles.id,
      authUserId: UserProfiles.authUserId,
      userEmail: UserProfiles.userEmail,
      userName: UserProfiles.userName,
      userImage: UserProfiles.userImage,
      role: UserProfiles.role,
      accountId: CreditAccounts.id,
      credit: CreditAccounts.balance,
    })
    .from(UserProfiles)
    .innerJoin(CreditAccounts, eq(CreditAccounts.userId, UserProfiles.id))
    .where(eq(UserProfiles.authUserId, authUserId))
    .limit(1);

  return rows[0] ?? null;
};

export const getCurrentAuthUser = async userId => {
  if (!userId) throw new ApiError(401, 'Unauthorized');
  const result = await db.execute(sql`
    SELECT id, email, name, image
    FROM neon_auth."user"
    WHERE id = ${userId}
    LIMIT 1
  `);
  const user = result.rows?.[0];
  if (!user) throw new ApiError(401, 'Authenticated user no longer exists');
  return user;
};

export const syncUserFromAuth = async userId => {
  const authUser = await getCurrentAuthUser(userId);
  const userEmail = String(authUser.email ?? '')
    .trim()
    .toLowerCase();
  if (!userEmail)
    throw new ApiError(400, 'Authenticated user has no email address');

  const values = {
    authUserId: userId,
    userEmail,
    userName: String(authUser.name || userEmail).trim(),
    userImage: String(authUser.image || ''),
    updatedAt: new Date(),
  };

  const [profile] = await db
    .insert(UserProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: UserProfiles.authUserId,
      set: {
        userEmail: values.userEmail,
        userName: values.userName,
        userImage: values.userImage,
        updatedAt: values.updatedAt,
      },
    })
    .returning({ id: UserProfiles.id });

  const insertedAccounts = await db
    .insert(CreditAccounts)
    .values({ userId: profile.id })
    .onConflictDoNothing({ target: CreditAccounts.userId })
    .returning({ id: CreditAccounts.id, balance: CreditAccounts.balance });

  if (insertedAccounts[0]) {
    await db.execute(sql`
      INSERT INTO app.credit_ledger (
        account_id, amount, balance_after, reason, idempotency_key
      ) VALUES (
        ${insertedAccounts[0].id}, ${insertedAccounts[0].balance},
        ${insertedAccounts[0].balance}, 'signup', ${`signup:${userId}`}
      )
      ON CONFLICT (idempotency_key) DO NOTHING
    `);
  }

  const user = await selectUserByAuthId(userId);
  if (!user) throw new ApiError(500, 'Unable to initialize user profile');
  return user;
};

const mutateCredits = async ({ profileId, amount, reason, idempotencyKey }) => {
  const safeAmount = Number(amount);
  if (!Number.isInteger(safeAmount) || safeAmount === 0) {
    throw new ApiError(400, 'Credit amount must be a non-zero integer');
  }

  const key = String(idempotencyKey || `${reason}:${randomUUID()}`);
  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE app.credit_accounts
      SET balance = balance + ${safeAmount}, updated_at = now()
      WHERE user_id = ${profileId}
        AND balance + ${safeAmount} >= 0
        AND NOT EXISTS (SELECT 1 FROM app.credit_ledger WHERE idempotency_key = ${key})
      RETURNING id, user_id, balance
    ), recorded AS (
      INSERT INTO app.credit_ledger (account_id, amount, balance_after, reason, idempotency_key)
      SELECT id, ${safeAmount}, balance, ${reason}, ${key} FROM updated
      RETURNING account_id
    )
    SELECT
      profile.id,
      profile.auth_user_id AS "authUserId",
      profile.email AS "userEmail",
      profile.display_name AS "userName",
      profile.avatar_url AS "userImage",
      profile.role,
      updated.id AS "accountId",
      updated.balance AS credit
    FROM updated
    INNER JOIN recorded ON recorded.account_id = updated.id
    INNER JOIN app.user_profiles profile ON profile.id = updated.user_id
  `);

  const user = result.rows?.[0];
  if (!user) {
    if (safeAmount < 0) throw new ApiError(402, 'Insufficient credits');
    throw new ApiError(409, 'Credit mutation was already applied');
  }
  return user;
};

export const incrementUserCreditsByProfileId = async (
  profileId,
  amount = 1,
  options = {}
) =>
  mutateCredits({
    profileId,
    amount: Math.abs(Number(amount)),
    reason: options.reason || 'refund',
    idempotencyKey: options.idempotencyKey,
  });

export const incrementUserCredits = async (
  userId,
  amount = 1,
  options = {}
) => {
  const user = await syncUserFromAuth(userId);
  return incrementUserCreditsByProfileId(user.id, amount, options);
};

export const decrementUserCredits = async (
  userId,
  amount = 1,
  options = {}
) => {
  const safeAmount = Number(amount);
  if (!Number.isInteger(safeAmount) || safeAmount <= 0) {
    throw new ApiError(400, 'Credit amount must be a positive integer');
  }

  const user = await syncUserFromAuth(userId);
  return mutateCredits({
    profileId: user.id,
    amount: -safeAmount,
    reason: options.reason || 'generation',
    idempotencyKey: options.idempotencyKey,
  });
};
