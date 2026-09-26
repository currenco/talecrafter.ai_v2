import { randomUUID } from 'node:crypto';
import { and, desc, eq, like, ne, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  GenerationJobs,
  Stories,
  StoryVersions,
  UserProfiles,
} from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import {
  buildStoryAssetsInsert,
  deleteStoryAssets,
  discardUploadedAssets,
  uploadAssetBatch,
} from './asset.service.js';
import {
  buildGeneratedImageRequest,
  generateStoryDraft,
  getGenerationProviderMetadata,
} from './generation.service.js';
import {
  attachGenerationStory,
  buildGenerationSuccessUpdate,
  failGenerationJob,
  reserveGenerationForProfile,
} from './generationJob.service.js';
import { getPollinationsAccessTokenForProfile } from './pollinations.service.js';
import { syncUserFromAuth } from './user.service.js';

const MAX_BASE_SLUG_LENGTH = 70;

const storySelection = {
  id: Stories.id,
  storyId: Stories.storyId,
  ownerId: Stories.ownerId,
  slug: Stories.slug,
  storySubject: Stories.storySubject,
  storyType: Stories.storyType,
  ageGroup: Stories.ageGroup,
  imageStyle: Stories.imageStyle,
  status: Stories.status,
  coverImage: Stories.coverImage,
  output: StoryVersions.output,
  userName: UserProfiles.userName,
  userImage: UserProfiles.userImage,
  userEmail: UserProfiles.userEmail,
  createdAt: Stories.createdAt,
  updatedAt: Stories.updatedAt,
};

const selectStories = () =>
  db
    .select(storySelection)
    .from(Stories)
    .innerJoin(UserProfiles, eq(UserProfiles.id, Stories.ownerId))
    .innerJoin(
      StoryVersions,
      and(eq(StoryVersions.storyId, Stories.id), eq(StoryVersions.version, 1))
    );

const clampLimit = value => {
  const limit = Number(value ?? 12);
  if (!Number.isFinite(limit)) return 12;
  return Math.min(50, Math.max(1, Math.floor(limit)));
};

const normalizeOffset = value => {
  const offset = Number(value ?? 0);
  if (!Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
};

export const slugifyStoryTitle = title => {
  const normalized = String(title ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE_SLUG_LENGTH)
    .replace(/-+$/g, '');

  return normalized || 'story';
};

export const extractStoryTitle = story => {
  const output = story?.output;
  const title = String(output?.title ?? '').trim();
  if (title) return title;

  const subject = String(story?.storySubject ?? '').trim();
  if (subject) return subject;

  return 'AI Generated Story';
};

const buildSlugFilter = (baseSlug, excludeStoryId) => {
  if (!excludeStoryId) {
    return like(Stories.slug, `${baseSlug}%`);
  }

  return and(
    like(Stories.slug, `${baseSlug}%`),
    ne(Stories.storyId, excludeStoryId)
  );
};

export const generateUniqueStorySlug = async (title, opts = {}) => {
  const baseSlug = slugifyStoryTitle(title);
  const rows = await db
    .select({ slug: Stories.slug })
    .from(Stories)
    .where(buildSlugFilter(baseSlug, opts.excludeStoryId));

  const used = new Set(
    rows.map(row => String(row.slug ?? '').trim()).filter(Boolean)
  );

  if (!used.has(baseSlug)) return baseSlug;

  let maxSuffix = 1;
  for (const slug of used) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > maxSuffix) {
      maxSuffix = value;
    }
  }

  return `${baseSlug}-${maxSuffix + 1}`;
};

export const listPublicStories = async ({ limit, offset }) => {
  return selectStories()
    .where(eq(Stories.status, 'published'))
    .orderBy(desc(Stories.createdAt))
    .limit(clampLimit(limit))
    .offset(normalizeOffset(offset));
};

export const listCurrentUserStories = async ({ userId, limit, offset }) => {
  const user = await syncUserFromAuth(userId);

  return selectStories()
    .where(and(eq(Stories.ownerId, user.id), eq(Stories.kind, 'classic')))
    .orderBy(desc(Stories.createdAt))
    .limit(clampLimit(limit))
    .offset(normalizeOffset(offset));
};

export const getStoryBySlug = async slug => {
  const safeSlug = String(slug ?? '').trim();
  if (!safeSlug) throw new ApiError(400, 'Story slug is required');

  const result = await selectStories()
    .where(and(eq(Stories.slug, safeSlug), eq(Stories.status, 'published')))
    .limit(1);

  return result[0] ?? null;
};

export const getStoryByStoryId = async storyId => {
  const safeStoryId = String(storyId ?? '').trim();
  if (!safeStoryId) throw new ApiError(400, 'Story ID is required');

  const result = await selectStories()
    .where(
      and(eq(Stories.storyId, safeStoryId), eq(Stories.status, 'published'))
    )
    .limit(1);

  return result[0] ?? null;
};

export const listRelatedStories = async ({
  storyId,
  storyType,
  limit,
  offset,
}) => {
  const safeStoryId = String(storyId ?? '').trim();
  if (!safeStoryId) throw new ApiError(400, 'Story ID is required');

  const baseFilter = and(
    ne(Stories.storyId, safeStoryId),
    eq(Stories.status, 'published')
  );
  const orderClause = storyType
    ? sql`CASE WHEN ${Stories.storyType} = ${String(storyType).trim()} THEN 0 ELSE 1 END, RANDOM()`
    : sql`RANDOM()`;

  const [stories, totalResult] = await Promise.all([
    selectStories()
      .where(baseFilter)
      .orderBy(orderClause)
      .limit(clampLimit(limit))
      .offset(normalizeOffset(offset)),
    db
      .select({ count: sql`count(*)` })
      .from(Stories)
      .where(baseFilter),
  ]);

  return {
    stories,
    totalCount: Number(totalResult?.[0]?.count ?? 0),
  };
};

const findResumableClassicDraft = async ({ ownerId, payload }) => {
  const [draft] = await db
    .select({
      id: Stories.id,
      storyId: Stories.storyId,
      slug: Stories.slug,
      title: Stories.title,
      coverImage: Stories.coverImage,
      output: StoryVersions.output,
    })
    .from(Stories)
    .innerJoin(
      StoryVersions,
      and(eq(StoryVersions.storyId, Stories.id), eq(StoryVersions.version, 1))
    )
    .where(
      and(
        eq(Stories.ownerId, ownerId),
        eq(Stories.kind, 'classic'),
        eq(Stories.status, 'draft'),
        eq(Stories.storySubject, payload?.storySubject),
        eq(Stories.storyType, payload?.storyType),
        eq(Stories.ageGroup, payload?.ageGroup),
        eq(Stories.imageStyle, payload?.imageStyle)
      )
    )
    .orderBy(desc(Stories.updatedAt))
    .limit(1);

  return draft ?? null;
};

const uploadClassicStoryImage = async ({
  ownerId,
  publicStoryId,
  source,
  purpose,
}) => {
  const [upload] = await uploadAssetBatch({
    ownerId,
    publicStoryId,
    images: [{ ...source, purpose }],
    concurrency: 1,
  });
  return upload;
};

const completeClassicStoryImages = async ({
  internalStoryId,
  output,
  imageStyle,
  ownerId,
  publicStoryId,
  accessToken,
  existingCoverImage,
}) => {
  let story = output ?? {};
  const title = String(story?.title ?? 'Story');
  const chapters = Array.isArray(story?.chapters)
    ? story.chapters.map(chapter => ({ ...chapter }))
    : [];
  let coverImage = existingCoverImage;

  if (!coverImage) {
    const coverPromptSource = String(
      story?.coverImagePrompt ??
        `${title} ${imageStyle ?? 'illustration'} book cover`
    );
    const coverPrompt = `Add-title-"${title.replace(/\s+/g, '-')}"-in-bold-text-for-book-cover-image,-${coverPromptSource.replace(/\s+/g, '-')}`;
    const coverRequest = buildGeneratedImageRequest(coverPrompt, accessToken, {
      width: 410,
      height: 630,
      seed: Date.now(),
    });
    const upload = await uploadClassicStoryImage({
      ownerId,
      publicStoryId,
      source: coverRequest,
      purpose: 'cover',
    });

    try {
      await db.batch([
        buildStoryAssetsInsert({
          ownerId,
          storyId: internalStoryId,
          uploads: [upload],
        }),
        db
          .update(Stories)
          .set({ coverImage: upload.url, updatedAt: new Date() })
          .where(eq(Stories.id, internalStoryId)),
      ]);
      coverImage = upload.url;
    } catch (error) {
      await discardUploadedAssets([upload]);
      throw error;
    }
  }

  for (const [index, chapter] of chapters.entries()) {
    if (String(chapter?.imageUrl ?? '').trim()) continue;

    const prompt = String(
      chapter?.imagePrompt ?? chapter?.textPrompt ?? `${title} illustration`
    ).trim();
    const request = buildGeneratedImageRequest(prompt, accessToken, {
      seed: `${Date.now()}_${index}_${Math.floor(Math.random() * 100000)}`,
    });
    const upload = await uploadClassicStoryImage({
      ownerId,
      publicStoryId,
      source: request,
      purpose: `chapter-${index + 1}`,
    });
    chapters[index] = {
      ...chapter,
      chapterNumber: index + 1,
      imagePrompt: prompt,
      imageUrl: upload.url,
    };
    story = { ...story, chapters };

    try {
      await db.batch([
        buildStoryAssetsInsert({
          ownerId,
          storyId: internalStoryId,
          uploads: [upload],
        }),
        db
          .update(StoryVersions)
          .set({ output: story })
          .where(
            and(
              eq(StoryVersions.storyId, internalStoryId),
              eq(StoryVersions.version, 1)
            )
          ),
        db
          .update(Stories)
          .set({ updatedAt: new Date() })
          .where(eq(Stories.id, internalStoryId)),
      ]);
    } catch (error) {
      await discardUploadedAssets([upload]);
      throw error;
    }
  }

  return {
    output: story,
    coverImage,
  };
};

const processClassicStoryDraft = async ({
  draft,
  payload,
  ownerId,
  jobId,
  startedAt,
  accessToken,
}) => {
  try {
    const prepared = await completeClassicStoryImages({
      internalStoryId: draft.id,
      output: draft.output,
      imageStyle: payload?.imageStyle,
      ownerId,
      publicStoryId: draft.storyId,
      accessToken,
      existingCoverImage: draft.coverImage,
    });

    const result = { id: draft.id, storyId: draft.storyId, slug: draft.slug };
    await db.batch([
      db
        .update(Stories)
        .set({
          status: 'published',
          coverImage: prepared.coverImage,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(Stories.id, draft.id)),
      db
        .update(StoryVersions)
        .set({ output: prepared.output })
        .where(
          and(eq(StoryVersions.storyId, draft.id), eq(StoryVersions.version, 1))
        ),
      buildGenerationSuccessUpdate({
        jobId,
        storyId: draft.id,
        result,
        startedAt,
      }),
    ]);
  } catch (error) {
    await failGenerationJob({ jobId, error, startedAt });
    logger.error('Classic story image generation failed', {
      jobId,
      storyId: draft.storyId,
      message: error?.message,
    });
  }
};

const startClassicStoryImageGeneration = options => {
  void processClassicStoryDraft(options);
};

const getOwnedClassicDraft = async ({ ownerId, storyId }) => {
  const [draft] = await db
    .select({
      id: Stories.id,
      storyId: Stories.storyId,
      slug: Stories.slug,
      title: Stories.title,
      coverImage: Stories.coverImage,
      storySubject: Stories.storySubject,
      storyType: Stories.storyType,
      ageGroup: Stories.ageGroup,
      imageStyle: Stories.imageStyle,
      output: StoryVersions.output,
    })
    .from(Stories)
    .innerJoin(
      StoryVersions,
      and(eq(StoryVersions.storyId, Stories.id), eq(StoryVersions.version, 1))
    )
    .where(
      and(
        eq(Stories.ownerId, ownerId),
        eq(Stories.storyId, storyId),
        eq(Stories.kind, 'classic'),
        eq(Stories.status, 'draft')
      )
    )
    .limit(1);

  return draft ?? null;
};

const hasRunningStoryGeneration = async internalStoryId => {
  const [job] = await db
    .select({ id: GenerationJobs.id })
    .from(GenerationJobs)
    .where(
      and(
        eq(GenerationJobs.storyId, internalStoryId),
        eq(GenerationJobs.status, 'running')
      )
    )
    .limit(1);
  return Boolean(job);
};

export const createClassicStory = async ({
  userId,
  idempotencyKey,
  payload,
}) => {
  const provider = getGenerationProviderMetadata();
  const user = await syncUserFromAuth(userId);
  let draft = await findResumableClassicDraft({ ownerId: user.id, payload });
  if (draft && (await hasRunningStoryGeneration(draft.id))) {
    return {
      id: draft.id,
      storyId: draft.storyId,
      slug: draft.slug,
      status: 'draft',
      user,
    };
  }
  const reservation = await reserveGenerationForProfile({
    profileId: user.id,
    idempotencyKey,
    kind: 'classic',
    request: payload,
    provider: provider.provider,
    model: provider.model,
    creditCost: 1,
    storyId: draft?.id ?? null,
  });
  if (reservation.cached) {
    return {
      ...reservation.result,
      status: 'published',
      user: reservation.user,
    };
  }

  const reservedUser = reservation.user;
  const jobId = reservation.job.id;
  const startedAt = Date.now();

  try {
    const pollinationsAccessToken = await getPollinationsAccessTokenForProfile(
      reservedUser.id
    );

    if (!draft) {
      const generatedStory = await generateStoryDraft({ formData: payload });
      const title = extractStoryTitle({
        output: generatedStory,
        storySubject: payload?.storySubject,
      });
      const internalStoryId = randomUUID();
      const storyId = randomUUID();
      const slug = await generateUniqueStorySlug(title);

      await db.batch([
        db.insert(Stories).values({
          id: internalStoryId,
          storyId,
          ownerId: reservedUser.id,
          slug,
          kind: 'classic',
          status: 'draft',
          title,
          ageGroup: payload?.ageGroup,
          storyType: payload?.storyType,
          storySubject: payload?.storySubject,
          imageStyle: payload?.imageStyle,
        }),
        db.insert(StoryVersions).values({
          storyId: internalStoryId,
          version: 1,
          output: generatedStory,
          providerPayload: provider,
        }),
        attachGenerationStory({ jobId, storyId: internalStoryId }),
      ]);

      draft = {
        id: internalStoryId,
        storyId,
        slug,
        title,
        coverImage: null,
        output: generatedStory,
      };
    }

    startClassicStoryImageGeneration({
      draft,
      payload,
      ownerId: reservedUser.id,
      jobId,
      startedAt,
      accessToken: pollinationsAccessToken,
    });

    return {
      id: draft.id,
      storyId: draft.storyId,
      slug: draft.slug,
      status: 'draft',
      user: reservedUser,
    };
  } catch (error) {
    await failGenerationJob({ jobId, error, startedAt });
    throw error;
  }
};

export const getCurrentUserStoryStatus = async ({ userId, storyId }) => {
  const user = await syncUserFromAuth(userId);
  const safeStoryId = String(storyId ?? '').trim();
  if (!safeStoryId) throw new ApiError(400, 'Story ID is required');

  const [story] = await db
    .select({
      id: Stories.id,
      storyId: Stories.storyId,
      slug: Stories.slug,
      status: Stories.status,
      coverImage: Stories.coverImage,
      output: StoryVersions.output,
    })
    .from(Stories)
    .innerJoin(
      StoryVersions,
      and(eq(StoryVersions.storyId, Stories.id), eq(StoryVersions.version, 1))
    )
    .where(and(eq(Stories.storyId, safeStoryId), eq(Stories.ownerId, user.id)))
    .limit(1);

  if (!story) throw new ApiError(404, 'Story not found');

  const [job] = await db
    .select({
      status: GenerationJobs.status,
      errorMessage: GenerationJobs.errorMessage,
    })
    .from(GenerationJobs)
    .where(eq(GenerationJobs.storyId, story.id))
    .orderBy(desc(GenerationJobs.createdAt))
    .limit(1);
  const chapters = Array.isArray(story.output?.chapters)
    ? story.output.chapters
    : [];

  return {
    storyId: story.storyId,
    slug: story.slug,
    status: story.status,
    generationStatus:
      story.status === 'published' ? 'succeeded' : (job?.status ?? 'idle'),
    errorMessage: job?.errorMessage ?? null,
    completedImages:
      chapters.filter(chapter => Boolean(chapter?.imageUrl)).length +
      (story.coverImage ? 1 : 0),
    totalImages: chapters.length + 1,
  };
};

export const resumeClassicStory = async ({
  userId,
  storyId,
  idempotencyKey,
}) => {
  const user = await syncUserFromAuth(userId);
  const safeStoryId = String(storyId ?? '').trim();
  if (!safeStoryId) throw new ApiError(400, 'Story ID is required');

  const draft = await getOwnedClassicDraft({
    ownerId: user.id,
    storyId: safeStoryId,
  });
  if (!draft) throw new ApiError(404, 'Story draft not found');

  if (await hasRunningStoryGeneration(draft.id)) {
    return { storyId: draft.storyId, slug: draft.slug, status: 'draft', user };
  }

  const payload = {
    storySubject: draft.storySubject,
    storyType: draft.storyType,
    ageGroup: draft.ageGroup,
    imageStyle: draft.imageStyle,
  };
  const provider = getGenerationProviderMetadata();
  const reservation = await reserveGenerationForProfile({
    profileId: user.id,
    idempotencyKey,
    kind: 'classic_resume',
    request: payload,
    provider: provider.provider,
    model: provider.model,
    creditCost: 1,
    storyId: draft.id,
  });
  const startedAt = Date.now();

  try {
    const accessToken = await getPollinationsAccessTokenForProfile(user.id);
    startClassicStoryImageGeneration({
      draft,
      payload,
      ownerId: user.id,
      jobId: reservation.job.id,
      startedAt,
      accessToken,
    });
    return {
      storyId: draft.storyId,
      slug: draft.slug,
      status: 'draft',
      user: reservation.user ?? user,
    };
  } catch (error) {
    await failGenerationJob({
      jobId: reservation.job.id,
      error,
      startedAt,
    });
    throw error;
  }
};

export const deleteCurrentUserStory = async ({ userId, storyId }) => {
  const user = await syncUserFromAuth(userId);
  const safeStoryId = String(storyId ?? '').trim();

  if (!safeStoryId) throw new ApiError(400, 'Story ID is required');

  const [ownedStory] = await db
    .select({ id: Stories.id })
    .from(Stories)
    .where(and(eq(Stories.storyId, safeStoryId), eq(Stories.ownerId, user.id)))
    .limit(1);

  if (!ownedStory) {
    throw new ApiError(404, 'Story not found or you do not have access');
  }

  await deleteStoryAssets(ownedStory.id);
  const [deleted] = await db
    .delete(Stories)
    .where(eq(Stories.id, ownedStory.id))
    .returning({ storyId: Stories.storyId });

  return deleted;
};
