import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { UserProfiles } from '../src/db/schema.js';

const [authUserId, role = 'admin'] = process.argv.slice(2);

if (!authUserId || !['user', 'admin'].includes(role)) {
  throw new Error(
    'Usage: npm run user:set-role -- <auth-user-id> <user|admin>'
  );
}

const [profile] = await db
  .update(UserProfiles)
  .set({ role, updatedAt: new Date() })
  .where(eq(UserProfiles.authUserId, authUserId))
  .returning({
    id: UserProfiles.id,
    authUserId: UserProfiles.authUserId,
    role: UserProfiles.role,
  });

if (!profile) {
  throw new Error('Profile not found. Sign in once before assigning a role.');
}

console.log(JSON.stringify(profile, null, 2));
