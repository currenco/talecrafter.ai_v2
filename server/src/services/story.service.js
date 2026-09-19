import { randomUUID } from 'node:crypto';
import { and, desc, eq, like, ne, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { Stories, StoryVersions, UserProfiles } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import {
  deleteStoryAssets,
  discardUploadedAssets,
  recordStoryAssets,
  uploadAssetBatch,
} from './asset.service.js';
import { buildPollinationsImageUrl } from './image.service.js';
import { generateStoryJson } from './gemini.service.js';
import {
  decrementUserCredits,
  incrementUserCreditsByProfileId,
  syncUserFromAuth,
} from './user.service.js';

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
    .where(eq(Stories.ownerId, user.id))
    .orderBy(desc(Stories.createdAt))
    .limit(clampLimit(limit))
    .offset(normalizeOffset(offset));
};

export const getStoryBySlug = async slug => {
  const safeSlug = String(slug ?? '').trim();
  if (!safeSlug) throw new ApiError(400, 'Story slug is required');

  const result = await selectStories()
    .where(eq(Stories.slug, safeSlug))
    .limit(1);

  return result[0] ?? null;
};

export const getStoryByStoryId = async storyId => {
  const safeStoryId = String(storyId ?? '').trim();
  if (!safeStoryId) throw new ApiError(400, 'Story ID is required');

  const result = await selectStories()
    .where(eq(Stories.storyId, safeStoryId))
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

const prepareClassicStoryImages = async ({
  output,
  imageStyle,
  ownerId,
  publicStoryId,
}) => {
  const story = output ?? {};
  const title = String(story?.title ?? 'Story');
  const chapters = Array.isArray(story?.chapters) ? story.chapters : [];
  const coverPromptSource = String(
    story?.coverImagePrompt ??
      `${title} ${imageStyle ?? 'illustration'} book cover`
  );
  const coverPrompt = `Add-title-"${title.replace(/\s+/g, '-')}"-in-bold-text-for-book-cover-image,-${coverPromptSource.replace(/\s+/g, '-')}`;
  const coverUrl = buildPollinationsImageUrl(coverPrompt, {
    width: 410,
    height: 630,
    seed: Date.now(),
  });

  const chapterSources = chapters.map((chapter, index) => {
    const prompt = String(
      chapter?.imagePrompt ?? chapter?.textPrompt ?? `${title} illustration`
    ).trim();
    return {
      prompt,
      sourceUrl: buildPollinationsImageUrl(prompt, {
        seed: `${Date.now()}_${index}_${Math.floor(Math.random() * 100000)}`,
      }),
      purpose: `chapter-${index + 1}`,
    };
  });
  const uploads = await uploadAssetBatch({
    ownerId,
    publicStoryId,
    images: [
      { sourceUrl: coverUrl, purpose: 'cover' },
      ...chapterSources.map(({ sourceUrl, purpose }) => ({
        sourceUrl,
        purpose,
      })),
    ],
  });
  const persistedChapters = chapters.map((chapter, index) => ({
    ...chapter,
    chapterNumber: Number(chapter?.chapterNumber ?? index + 1),
    imagePrompt: chapterSources[index].prompt,
    imageUrl: uploads[index + 1].url,
  }));

  return {
    output: {
      ...story,
      chapters: persistedChapters,
    },
    coverImage: uploads[0].url,
    uploads,
  };
};

export const createClassicStory = async ({ userId, payload }) => {
  const reservedUser = await decrementUserCredits(userId, 1);
  const storyId = randomUUID();
  let uploads = [];

  try {
    const generatedStory = await generateStoryJson({ formData: payload });
    const prepared = await prepareClassicStoryImages({
      output: generatedStory,
      imageStyle: payload?.imageStyle,
      ownerId: reservedUser.id,
      publicStoryId: storyId,
    });
    uploads = prepared.uploads;
    const title = extractStoryTitle({
      output: prepared.output,
      storySubject: payload?.storySubject,
    });
    const slug = await generateUniqueStorySlug(title);

    const inserted = await db
      .insert(Stories)
      .values({
        storyId,
        ownerId: reservedUser.id,
        slug,
        kind: 'classic',
        status: 'published',
        title,
        ageGroup: payload?.ageGroup,
        storyType: payload?.storyType,
        storySubject: payload?.storySubject,
        imageStyle: payload?.imageStyle,
        coverImage: prepared.coverImage,
        publishedAt: new Date(),
      })
      .returning({
        id: Stories.id,
        storyId: Stories.storyId,
        slug: Stories.slug,
      });

    await db.insert(StoryVersions).values({
      storyId: inserted[0].id,
      version: 1,
      output: prepared.output,
    });
    await recordStoryAssets({
      ownerId: reservedUser.id,
      storyId: inserted[0].id,
      uploads,
    });

    return {
      ...inserted[0],
      user: reservedUser,
    };
  } catch (error) {
    await discardUploadedAssets(uploads);
    await db.delete(Stories).where(eq(Stories.storyId, storyId));
    await incrementUserCreditsByProfileId(reservedUser.id, 1, {
      reason: 'generation_refund',
      idempotencyKey: `classic-refund:${reservedUser.id}:${storyId}`,
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
