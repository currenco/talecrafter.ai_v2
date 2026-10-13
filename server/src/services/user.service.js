import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { UserProfiles } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import { getEntitlement } from './entitlement.service.js';

const selectUserByAuthId = async authUserId => {
  const rows = await db
    .select({
      id: UserProfiles.id,
      authUserId: UserProfiles.authUserId,
      userEmail: UserProfiles.userEmail,
      userName: UserProfiles.userName,
      userImage: UserProfiles.userImage,
      role: UserProfiles.role,
    })
    .from(UserProfiles)
    .where(eq(UserProfiles.authUserId, authUserId))
    .limit(1);

  return rows[0] ? { ...rows[0], ...(await getEntitlement(rows[0].id)) } : null;
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
    })
    .from(UserProfiles)
    .where(eq(UserProfiles.id, profileId))
    .limit(1);

  if (!rows[0]) throw new ApiError(404, 'User profile not found');
  return { ...rows[0], ...(await getEntitlement(rows[0].id)) };
};

export const getCurrentAuthUser = async userId => {
  if (!userId)
    throw new ApiError(401, 'Unauthorized', [{ code: 'AUTH_SESSION_INVALID' }]);
  const result = await db.execute(sql`
    SELECT id, email, name, image
    FROM neon_auth."user"
    WHERE id = ${userId}
    LIMIT 1
  `);
  const user = result.rows?.[0];
  if (!user)
    throw new ApiError(401, 'Authenticated user no longer exists', [
      { code: 'AUTH_SESSION_INVALID' },
    ]);
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

  await db
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

  const user = await selectUserByAuthId(userId);
  if (!user) throw new ApiError(500, 'Unable to initialize user profile');
  return user;
};
