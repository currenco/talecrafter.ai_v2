import { createHash, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { GenerationJobs } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import { getUserByProfileId, syncUserFromAuth } from './user.service.js';

const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9._:-]{8,255}$/;

const canonicalize = value => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, canonicalize(value[key])])
  );
};

const hashRequest = request =>
  createHash('sha256')
    .update(JSON.stringify(canonicalize(request ?? {})))
    .digest('hex');

const normalizeIdempotencyKey = value => {
  const key = String(value ?? '').trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new ApiError(400, 'A valid Idempotency-Key header is required');
  }
  return key;
};

const findJob = async ({ ownerId, idempotencyKey }) => {
  const [job] = await db
    .select()
    .from(GenerationJobs)
    .where(
      and(
        eq(GenerationJobs.ownerId, ownerId),
        eq(GenerationJobs.idempotencyKey, idempotencyKey)
      )
    )
    .limit(1);
  return job ?? null;
};

const resolveExistingJob = async ({ job, requestHash }) => {
  if (job.requestHash !== requestHash) {
    throw new ApiError(
      409,
      'Idempotency key was already used for another request'
    );
  }
  if (job.status === 'succeeded') {
    return { cached: true, job, result: job.result };
  }
  if (job.status === 'failed' || job.status === 'cancelled') {
    throw new ApiError(
      409,
      'This generation attempt already failed; retry with a new idempotency key'
    );
  }
  throw new ApiError(425, 'This generation request is already in progress');
};

export const reserveGenerationForProfile = async ({
  profileId,
  idempotencyKey,
  kind,
  request,
  provider,
  model,
  creditCost = 0,
  storyId = null,
}) => {
  const key = normalizeIdempotencyKey(idempotencyKey);
  const requestHash = hashRequest({ kind, request, storyId });
  const existing = await findJob({ ownerId: profileId, idempotencyKey: key });
  if (existing) return resolveExistingJob({ job: existing, requestHash });

  const jobId = randomUUID();
  const safeCreditCost = Number(creditCost);
  if (!Number.isInteger(safeCreditCost) || safeCreditCost < 0) {
    throw new ApiError(500, 'Generation credit cost is invalid');
  }

  let insertedJob;
  if (safeCreditCost === 0) {
    [insertedJob] = await db
      .insert(GenerationJobs)
      .values({
        id: jobId,
        ownerId: profileId,
        storyId,
        idempotencyKey: key,
        requestHash,
        kind,
        provider,
        model,
        creditCost: 0,
        status: 'running',
        request,
        startedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
  } else {
    const result = await db.execute(sql`
      WITH eligible AS (
        SELECT account.id AS account_id, account.user_id
        FROM app.credit_accounts account
        WHERE account.user_id = ${profileId}
          AND account.balance >= ${safeCreditCost}
      ), inserted AS (
        INSERT INTO app.generation_jobs (
          id, owner_id, story_id, idempotency_key, request_hash, kind,
          provider, model, credit_cost, attempt_count, status, request,
          started_at, created_at, updated_at
        )
        SELECT
          ${jobId}, eligible.user_id, ${storyId}, ${key}, ${requestHash},
          ${kind}, ${provider}, ${model}, ${safeCreditCost}, 1, 'running',
          ${JSON.stringify(request)}::jsonb, now(), now(), now()
        FROM eligible
        ON CONFLICT (owner_id, idempotency_key) DO NOTHING
        RETURNING id, owner_id
      ), charged AS (
        UPDATE app.credit_accounts account
        SET balance = account.balance - ${safeCreditCost}, updated_at = now()
        FROM inserted
        WHERE account.user_id = inserted.owner_id
        RETURNING account.id, account.user_id, account.balance
      ), recorded AS (
        INSERT INTO app.credit_ledger (
          account_id, amount, balance_after, reason, idempotency_key,
          reference_type, reference_id
        )
        SELECT
          charged.id, ${-safeCreditCost}, charged.balance,
          'generation', ${`generation-charge:${jobId}`},
          'generation_job', ${jobId}
        FROM charged
        RETURNING account_id
      )
      SELECT inserted.id
      FROM inserted
      INNER JOIN charged ON charged.user_id = inserted.owner_id
      INNER JOIN recorded ON recorded.account_id = charged.id
    `);
    insertedJob = (result.rows ?? result)?.[0];
  }

  if (!insertedJob) {
    const racedJob = await findJob({ ownerId: profileId, idempotencyKey: key });
    if (racedJob) {
      return resolveExistingJob({ job: racedJob, requestHash });
    }
    throw new ApiError(402, 'Insufficient credits');
  }

  return {
    cached: false,
    job: insertedJob,
    user: await getUserByProfileId(profileId),
  };
};

export const reserveGeneration = async ({ userId, ...options }) => {
  const user = await syncUserFromAuth(userId);
  const reservation = await reserveGenerationForProfile({
    profileId: user.id,
    ...options,
  });
  return { ...reservation, user: reservation.user ?? user };
};

export const buildGenerationSuccessUpdate = ({
  jobId,
  storyId,
  result,
  startedAt,
}) =>
  db
    .update(GenerationJobs)
    .set({
      storyId,
      status: 'succeeded',
      result,
      errorCode: null,
      errorMessage: null,
      durationMs: Math.max(0, Date.now() - Number(startedAt)),
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(GenerationJobs.id, jobId), eq(GenerationJobs.status, 'running'))
    );

export const failGenerationJob = async ({ jobId, error, startedAt }) => {
  const statusCode = Number(error?.statusCode);
  const errorCode = Number.isInteger(statusCode)
    ? `HTTP_${statusCode}`
    : String(error?.code || error?.name || 'GENERATION_FAILED')
        .toUpperCase()
        .slice(0, 80);
  const errorMessage = String(error?.message || 'Generation failed').slice(
    0,
    1000
  );
  const durationMs = Math.max(0, Date.now() - Number(startedAt));

  await db.execute(sql`
    WITH claimed AS (
      UPDATE app.generation_jobs
      SET status = 'failed', error_code = ${errorCode},
        error_message = ${errorMessage}, duration_ms = ${durationMs},
        completed_at = now(), updated_at = now()
      WHERE id = ${jobId} AND status = 'running'
      RETURNING owner_id, credit_cost
    ), credited AS (
      UPDATE app.credit_accounts account
      SET balance = account.balance + claimed.credit_cost, updated_at = now()
      FROM claimed
      WHERE account.user_id = claimed.owner_id AND claimed.credit_cost > 0
      RETURNING account.id, account.balance, claimed.credit_cost
    )
    INSERT INTO app.credit_ledger (
      account_id, amount, balance_after, reason, idempotency_key,
      reference_type, reference_id
    )
    SELECT
      credited.id, credited.credit_cost, credited.balance,
      'generation_refund', ${`generation-refund:${jobId}`},
      'generation_job', ${jobId}
    FROM credited
    ON CONFLICT (idempotency_key) DO NOTHING
  `);
};
