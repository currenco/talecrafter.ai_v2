import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import ApiError from '../utils/ApiError.js';

export const claimLegacyProfile = async (authId, email) => {
  const pending = await db.execute(sql`SELECT id FROM app.user_profiles
    WHERE auth_user_id LIKE 'legacy:storybook:%' AND lower(trim(email)) = ${email} LIMIT 1`);
  if (!pending.rows?.length) return;

  try {
    await db.batch([
      db.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`
      ),
      db.execute(
        sql`SELECT id FROM neon_auth."user" WHERE lower(trim(email)) = ${email} FOR SHARE`
      ),
      db.execute(
        sql`SELECT id FROM app.user_profiles WHERE lower(trim(email)) = ${email} ORDER BY id FOR UPDATE`
      ),
      // Recheck trusted identity inside the transaction, never from browser claims.
      db.execute(sql`CREATE TEMP TABLE legacy_claim ON COMMIT DROP AS
        SELECT old.id AS old_id, current.id AS current_id
        FROM app.user_profiles old
        JOIN app.user_profiles current ON current.auth_user_id = ${authId}
        JOIN neon_auth."user" identity ON identity.id = ${authId}
        WHERE old.auth_user_id LIKE 'legacy:storybook:%'
          AND old.role = 'user'
          AND lower(trim(old.email)) = ${email}
          AND lower(trim(current.email)) = ${email}
          AND lower(trim(identity.email)) = ${email}
          AND identity."emailVerified" IS TRUE
          AND (SELECT count(*) FROM neon_auth."user" WHERE lower(trim(email)) = ${email}) = 1
          AND (SELECT count(*) FROM app.user_profiles WHERE lower(trim(email)) = ${email} AND auth_user_id NOT LIKE 'legacy:storybook:%') = 1`),
      // Imported placeholders should only own stories/assets. Never cascade away
      // financial history, provider credentials, or work created by another identity.
      db.execute(sql`SELECT 1 / CASE WHEN
        (SELECT count(*) FROM legacy_claim) <= 1
        AND NOT EXISTS (SELECT 1 FROM app.user_profiles p WHERE lower(trim(p.email)) = ${email} AND p.auth_user_id LIKE 'legacy:storybook:%' AND NOT EXISTS (SELECT 1 FROM legacy_claim c WHERE c.old_id = p.id))
        AND NOT EXISTS (SELECT 1 FROM app.creator_subscriptions WHERE user_id IN (SELECT old_id FROM legacy_claim))
        AND NOT EXISTS (SELECT 1 FROM app.payments WHERE user_id IN (SELECT old_id FROM legacy_claim))
        AND NOT EXISTS (SELECT 1 FROM app.credit_accounts WHERE user_id IN (SELECT old_id FROM legacy_claim))
        AND NOT EXISTS (SELECT 1 FROM app.generation_jobs WHERE owner_id IN (SELECT old_id FROM legacy_claim))
        AND NOT EXISTS (SELECT 1 FROM app.pollinations_connections WHERE user_id IN (SELECT old_id FROM legacy_claim))
        AND NOT EXISTS (SELECT 1 FROM app.pollinations_oauth_states WHERE user_id IN (SELECT old_id FROM legacy_claim))
        THEN 1 ELSE 0 END AS safe_to_claim`),
      db.execute(
        sql`UPDATE app.stories s SET owner_id = c.current_id FROM legacy_claim c WHERE s.owner_id = c.old_id`
      ),
      db.execute(
        sql`UPDATE app.assets a SET owner_id = c.current_id FROM legacy_claim c WHERE a.owner_id = c.old_id`
      ),
      db.execute(
        sql`DELETE FROM app.user_profiles p USING legacy_claim c WHERE p.id = c.old_id`
      ),
    ]);
  } catch (cause) {
    const error = new ApiError(
      409,
      'We could not link your previous stories safely. Please contact support so we can restore your library.'
    );
    error.cause = cause;
    throw error;
  }
};
