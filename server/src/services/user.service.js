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

export const getUserByProfileId = async profileId => {
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
    .where(eq(UserProfiles.id, profileId))
    .limit(1);

  if (!rows[0]) throw new ApiError(404, 'User profile not found');
  return rows[0];
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
