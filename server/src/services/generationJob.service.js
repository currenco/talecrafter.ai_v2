import { createHash, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { GenerationJobs } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import { getUserByProfileId, syncUserFromAuth } from './user.service.js';

import { assertGenerationAccess } from './entitlement.service.js';

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
  storyId = null,
}) => {
  const key = normalizeIdempotencyKey(idempotencyKey);
  const requestHash = hashRequest({ kind, request, storyId });
  const existing = await findJob({ ownerId: profileId, idempotencyKey: key });
  if (existing) return resolveExistingJob({ job: existing, requestHash });

  const jobId = randomUUID();
  await assertGenerationAccess(profileId, kind);
  const [insertedJob] = await db
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
      status: 'running',
      request,
      startedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  if (!insertedJob) {
    const racedJob = await findJob({ ownerId: profileId, idempotencyKey: key });
    if (racedJob) return resolveExistingJob({ job: racedJob, requestHash });
    throw new ApiError(409, 'Unable to reserve generation');
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

export const attachGenerationStory = ({ jobId, storyId }) =>
  db
    .update(GenerationJobs)
    .set({ storyId, updatedAt: new Date() })
    .where(
      and(eq(GenerationJobs.id, jobId), eq(GenerationJobs.status, 'running'))
    );

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
      UPDATE app.generation_jobs SET status = 'failed', error_code = ${errorCode},
        error_message = ${errorMessage}, duration_ms = ${durationMs},
        completed_at = now(), updated_at = now()
      WHERE id = ${jobId} AND status = 'running'
  `);
};
