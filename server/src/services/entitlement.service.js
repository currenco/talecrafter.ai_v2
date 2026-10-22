import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import ApiError from '../utils/ApiError.js';
import {
  monthlyPeriod,
  generationPermission,
  hasCreatorAccess,
} from '../utils/plans.js';

export const getEntitlement = async profileId => {
  const result = await db.execute(sql`
    SELECT s.period_start AS "periodStart", s.paid_through AS "paidThrough",
      s.revoked, s.status, s.cancel_at_period_end AS "cancelAtPeriodEnd",
      s.provider_subscription_id AS "subscriptionId",
      EXISTS (
        SELECT 1 FROM neon_auth.account a
        WHERE a."userId"::text = p.auth_user_id AND a."providerId" = 'github'
      ) AS "githubConnected"
    FROM app.user_profiles p
    LEFT JOIN app.creator_subscriptions s ON s.user_id = p.id
    WHERE p.id = ${profileId}
  `);
  const row = result.rows[0];
  if (!row) throw new ApiError(404, 'User profile not found');
  const creator = hasCreatorAccess(row);
  return {
    plan: creator ? 'creator' : 'free',
    githubConnected: row.githubConnected,
    canCreate: true,
    canBranch: creator,
    canExport: creator,
    period: creator ? new Date(row.periodStart).toISOString() : null,
    paidThrough: row.paidThrough,
    subscriptionStatus: row.status ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
  };
};

export const assertGenerationAccess = async (profileId, kind = 'classic') => {
  const access = await getEntitlement(profileId);
  const reason = generationPermission({
    creator: access.plan === 'creator',
    kind,
  });
  if (reason) {
    throw new ApiError(
      403,
      'Creator subscription required for branching stories',
      [{ code: reason }]
    );
  }
  return access;
};

export const reserveUsage = async ({ id = randomUUID(), bucket, limit }) => {
  const result = await db.execute(sql`
    SELECT app.reserve_plan_usage(${id}::uuid, ${bucket}, ${limit}::integer) AS allowed
  `);
  if (!result.rows[0]?.allowed) {
    throw new ApiError(
      503,
      'Platform image generation capacity is temporarily unavailable',
      [{ code: 'PLATFORM_BUDGET_REACHED' }]
    );
  }
  return id;
};

export const reserveImage = async (profileId, verifiedAccess) => {
  const access = verifiedAccess ?? (await assertGenerationAccess(profileId));
  if (access.plan !== 'creator') return null;
  const limit = Number(process.env.POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new ApiError(503, 'Platform generation budget is not configured');
  }
  // Attempts are never refunded: a timed-out provider request may still cost money.
  await reserveUsage({
    bucket: `platform:${monthlyPeriod()}:image-attempts`,
    limit,
  });
  return null;
};
