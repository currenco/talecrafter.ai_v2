import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  InteractiveStories,
  InteractiveStoryNodes,
  Stories,
  StoryVersions,
  UserProfiles,
} from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import {
  buildStoryAssetsInsert,
  deleteStoryAssets,
  discardUploadedAssets,
  uploadAssetBatch,
} from './asset.service.js';
import { buildPollinationsImageUrl } from './image.service.js';
import { generateGeminiText, generateStoryJson } from './gemini.service.js';
import { generateUniqueStorySlug } from './story.service.js';
import {
  decrementUserCredits,
  incrementUserCreditsByProfileId,
  syncUserFromAuth,
} from './user.service.js';
import {
  buildChoicePrompt,
  buildContinuationPrompt,
  makePageContext,
  parseChoices,
  parseContinuationPayload,
  parsePages,
} from './plottwist.service.js';

const MIN_STARTER_PAGES = 5;
const MAX_DEPTH = 7;
const CONTINUATION_FALLBACK_CHOICES = [
  'Take the hopeful next step',
  'Risk a bold unknown path',
];
const STARTER_FALLBACK_CHOICES = [
  'Follow the hopeful path',
  'Explore the unknown path',
];

const mapStoryNode = (item, publicStoryId) => ({
  nodeId: String(item.nodeId),
  storyId: String(publicStoryId),
  parentNodeId: item.parentNodeId ? String(item.parentNodeId) : null,
  depth: Number(item.depth ?? 0),
  choiceTaken: item.choiceTaken ? String(item.choiceTaken) : null,
  choices: Array.isArray(item.choices) ? item.choices : null,
  selectedChoice: item.selectedChoice ? String(item.selectedChoice) : null,
  pages: Array.isArray(item.pages) ? item.pages : [],
  isActive: Boolean(item.isActive),
});

const interactiveSelection = {
  id: Stories.id,
  storyId: Stories.storyId,
  ownerId: Stories.ownerId,
  slug: Stories.slug,
  userEmail: UserProfiles.userEmail,
  userName: UserProfiles.userName,
  userImage: UserProfiles.userImage,
  title: Stories.title,
  storySubject: Stories.storySubject,
  storyType: Stories.storyType,
  ageGroup: Stories.ageGroup,
  imageStyle: Stories.imageStyle,
  status: Stories.status,
  rootNodeId: InteractiveStories.rootNodeId,
  currentNodeId: InteractiveStories.currentNodeId,
  totalPages: InteractiveStories.totalPages,
  compiledPages: InteractiveStories.compiledPages,
  coverImage: Stories.coverImage,
  createdAt: Stories.createdAt,
  updatedAt: Stories.updatedAt,
};

const mapInteractiveStory = story => ({
  ...story,
  status: story.status === 'published' ? 'completed' : story.status,
});

const interactiveStoryQuery = () =>
  db
    .select(interactiveSelection)
    .from(Stories)
    .innerJoin(UserProfiles, eq(UserProfiles.id, Stories.ownerId))
    .innerJoin(InteractiveStories, eq(InteractiveStories.storyId, Stories.id));

const ensureOwnedStory = async ({ userId, storyId }) => {
  const user = await syncUserFromAuth(userId);
  const safeStoryId = String(storyId ?? '').trim();

  if (!safeStoryId) throw new ApiError(400, 'Interactive story ID is required');

  const storyRows = await interactiveStoryQuery()
    .where(and(eq(Stories.storyId, safeStoryId), eq(Stories.ownerId, user.id)))
    .limit(1);
  const story = storyRows[0] ? mapInteractiveStory(storyRows[0]) : null;

  if (!story) throw new ApiError(404, 'Interactive story not found');

  return { user, story };
};

const listStoryNodes = async (internalStoryId, publicStoryId) => {
  const rows = await db
    .select()
    .from(InteractiveStoryNodes)
    .where(eq(InteractiveStoryNodes.storyId, internalStoryId))
    .orderBy(asc(InteractiveStoryNodes.createdAt));

  return rows.map(row => mapStoryNode(row, publicStoryId));
};

const getActiveNode = nodes =>
  nodes.find(node => node.isActive) ?? nodes[nodes.length - 1] ?? null;

const getLinearNodes = ({ activeNode, nodes }) => {
  if (!activeNode) return [];

  const nodeMap = new Map(nodes.map(node => [node.nodeId, node]));
  const chain = [];
  let cursor = activeNode;

  while (cursor) {
    chain.push(cursor);
    if (!cursor.parentNodeId) break;
    cursor = nodeMap.get(cursor.parentNodeId);
  }

  return chain.reverse();
};

const mapGeneratedPages = async ({
  pages,
  pageOffset,
  seedPrefix,
  ownerId,
  publicStoryId,
}) => {
  const sources = pages.map((page, index) => {
    const prompt = String(
      page.imagePrompt || page.text || 'Story illustration'
    );
    return {
      prompt,
      sourceUrl: buildPollinationsImageUrl(prompt, {
        seed: `${Date.now()}_${seedPrefix}_${index}_${Math.floor(Math.random() * 100000)}`,
      }),
      purpose: `${seedPrefix}-${pageOffset + index + 1}`,
    };
  });
  const uploads = await uploadAssetBatch({
    ownerId,
    publicStoryId,
    images: sources.map(({ sourceUrl, purpose }) => ({ sourceUrl, purpose })),
  });

  return {
    pages: pages.map((page, index) => ({
      ...page,
      pageNumber: pageOffset + index + 1,
      imagePrompt: sources[index].prompt,
      imageUrl: uploads[index].url,
    })),
    uploads,
  };
};

const getCompletedStorySlug = async storyId => {
  const existing = await db
    .select({ slug: Stories.slug })
    .from(Stories)
    .where(eq(Stories.storyId, storyId))
    .limit(1);

  return String(existing[0]?.slug ?? '').trim() || null;
};

const getInteractiveState = async story => {
  const nodes = await listStoryNodes(story.id, story.storyId);
  const completedSlug =
    story.status === 'completed'
      ? await getCompletedStorySlug(story.storyId)
      : null;

  return {
    story,
    nodes,
    ...(completedSlug ? { completedSlug } : {}),
  };
};

const buildCompletedStoryOutput = ({ pages, finalTitle }) => {
  const classicOutput = {
    title: finalTitle,
    chapters: pages.map((page, index) => ({
      chapterNumber: index + 1,
      title: page.title,
      textPrompt: page.text,
      imagePrompt: page.imagePrompt,
      imageUrl: page.imageUrl,
    })),
  };
  return classicOutput;
};

export const createInteractiveStarter = async ({ userId, payload }) => {
  const reservedUser = await decrementUserCredits(userId, 1);
  const formData = payload ?? {};
  const storyId = randomUUID();
  const internalStoryId = randomUUID();
  const rootNodeId = randomUUID();
  let uploads = [];

  try {
    const story = await generateStoryJson({ formData, interactive: true });
    const interactiveTitle = String(story?.title ?? 'Interactive Story');
    const slug = await generateUniqueStorySlug(interactiveTitle);
    const chapters = Array.isArray(story?.chapters) ? story.chapters : [];

    if (chapters.length < MIN_STARTER_PAGES) {
      throw new ApiError(400, 'Starter story must have at least 5 pages');
    }

    const coverPromptSource = String(
      story?.coverImagePrompt ||
        `${story?.title ?? 'Interactive story'} cinematic book cover, ${formData?.imageStyle ?? 'illustration'}`
    );
    const coverTitle = String(story?.title ?? 'Interactive Story').replace(
      /\s+/g,
      '-'
    );
    const coverPrompt = coverPromptSource.replace(/\s+/g, '-');
    const defaultStyleCoverPrompt = `Add-title-"${coverTitle}"-in-bold-text-for-book-cover-image,-${coverPrompt}`;
    const coverSeed = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
    const coverImageUrl = buildPollinationsImageUrl(defaultStyleCoverPrompt, {
      width: 410,
      height: 630,
      seed: coverSeed,
    });
    const starterSources = chapters.map((chapter, index) => {
      const prompt = String(
        chapter?.imagePrompt ?? chapter?.textPrompt ?? 'Story illustration'
      );
      return {
        prompt,
        sourceUrl: buildPollinationsImageUrl(prompt, {
          seed: `${Date.now()}_${index}_${Math.floor(Math.random() * 100000)}`,
        }),
        purpose: `starter-${index + 1}`,
      };
    });
    uploads = await uploadAssetBatch({
      ownerId: reservedUser.id,
      publicStoryId: storyId,
      images: [
        ...starterSources.map(({ sourceUrl, purpose }) => ({
          sourceUrl,
          purpose,
        })),
        { sourceUrl: coverImageUrl, purpose: 'cover' },
      ],
    });
    const starterPages = chapters.map((chapter, index) => ({
      pageNumber: index + 1,
      title: String(chapter?.title ?? `Chapter ${index + 1}`),
      text: String(chapter?.textPrompt ?? ''),
      imagePrompt: starterSources[index].prompt,
      imageUrl: uploads[index].url,
    }));
    const persistedCoverImageUrl = uploads.at(-1).url;

    let starterChoices = STARTER_FALLBACK_CHOICES;
    try {
      const starterChoiceText = await generateGeminiText({
        prompt: buildChoicePrompt(makePageContext(starterPages, 4)),
        mode: 'text',
      });
      const parsedChoices = parseChoices(starterChoiceText);
      if (parsedChoices.length >= 2) starterChoices = parsedChoices;
    } catch {
      starterChoices = STARTER_FALLBACK_CHOICES;
    }

    const now = new Date();

    await db.batch([
      db.insert(Stories).values({
        id: internalStoryId,
        storyId,
        ownerId: reservedUser.id,
        slug,
        kind: 'interactive',
        status: 'draft',
        title: interactiveTitle,
        storySubject: formData?.storySubject,
        storyType: formData?.storyType,
        ageGroup: formData?.ageGroup,
        imageStyle: formData?.imageStyle,
        coverImage: persistedCoverImageUrl,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(StoryVersions).values({
        storyId: internalStoryId,
        version: 1,
        output: { title: interactiveTitle, chapters: starterPages },
      }),
      db.insert(InteractiveStories).values({
        storyId: internalStoryId,
        rootNodeId,
        currentNodeId: rootNodeId,
        totalPages: starterPages.length,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(InteractiveStoryNodes).values({
        nodeId: rootNodeId,
        storyId: internalStoryId,
        parentNodeId: null,
        depth: 0,
        choiceTaken: null,
        choices: starterChoices,
        selectedChoice: null,
        pages: starterPages,
        isActive: true,
        createdAt: now,
      }),
      buildStoryAssetsInsert({
        ownerId: reservedUser.id,
        storyId: internalStoryId,
        uploads,
      }),
    ]);

    return { storyId, user: reservedUser };
  } catch (error) {
    await discardUploadedAssets(uploads);
    await db.delete(Stories).where(eq(Stories.storyId, storyId));
    await incrementUserCreditsByProfileId(reservedUser.id, 1, {
      reason: 'generation_refund',
      idempotencyKey: `interactive-refund:${reservedUser.id}:${storyId}`,
    });
    throw error;
  }
};

export const listCurrentUserInteractiveStories = async ({ userId }) => {
  const user = await syncUserFromAuth(userId);

  const stories = await interactiveStoryQuery()
    .where(eq(Stories.ownerId, user.id))
    .orderBy(asc(Stories.createdAt));

  return stories.map(mapInteractiveStory);
};

export const getCurrentUserInteractiveStory = async ({ userId, storyId }) => {
  const { story } = await ensureOwnedStory({ userId, storyId });
  return getInteractiveState(story);
};

export const deleteCurrentUserInteractiveStory = async ({
  userId,
  storyId,
}) => {
  const { story } = await ensureOwnedStory({ userId, storyId });

  await deleteStoryAssets(story.id);
  const deleted = await db
    .delete(Stories)
    .where(eq(Stories.id, story.id))
    .returning({ storyId: Stories.storyId });

  return deleted[0] ?? { storyId: story.storyId };
};

export const completeInteractiveStory = async ({
  userId,
  storyId,
  selectedChoice = 'End Story',
}) => {
  const { story } = await ensureOwnedStory({ userId, storyId });
  if (story.status === 'completed') {
    const completedSlug = await getCompletedStorySlug(story.storyId);
    return {
      completedSlug: completedSlug || story.storyId,
      ...(await getInteractiveState(story)),
    };
  }

  const nodes = await listStoryNodes(story.id, story.storyId);
  const activeNode = getActiveNode(nodes);
  if (!activeNode) throw new ApiError(404, 'Active story node not found');
  if (activeNode.selectedChoice)
    throw new ApiError(409, 'This branch is already locked');

  const linearNodes = getLinearNodes({ activeNode, nodes });
  const linearPages = linearNodes.flatMap(node => node.pages ?? []);
  const finalPrompt = buildContinuationPrompt({
    title: story.title,
    selectedChoice,
    context: makePageContext(linearPages, 6),
    minPages: 3,
    maxPages: 5,
    finalResolution: true,
  });
  const finalText = await generateGeminiText({
    prompt: finalPrompt,
    mode: 'text',
  });
  const resolutionPages = parsePages(finalText).slice(0, 5);

  if (resolutionPages.length < 3) {
    throw new ApiError(502, 'Final resolution must have at least 3 pages');
  }

  const finalNodeId = randomUUID();
  const { pages: persistedResolution, uploads } = await mapGeneratedPages({
    pages: resolutionPages,
    pageOffset: linearPages.length,
    seedPrefix: 'final',
    ownerId: story.ownerId,
    publicStoryId: story.storyId,
  });
  const compiledPages = [...linearPages, ...persistedResolution];
  const classicOutput = buildCompletedStoryOutput({
    pages: compiledPages,
    finalTitle: story.title,
  });
  const now = new Date();

  try {
    await db.batch([
      db
        .update(InteractiveStoryNodes)
        .set({ isActive: false, selectedChoice })
        .where(eq(InteractiveStoryNodes.nodeId, activeNode.nodeId)),
      db.insert(InteractiveStoryNodes).values({
        nodeId: finalNodeId,
        storyId: story.id,
        parentNodeId: activeNode.nodeId,
        depth: Math.min(MAX_DEPTH, Number(activeNode.depth ?? 0) + 1),
        choiceTaken: selectedChoice,
        choices: null,
        selectedChoice: null,
        pages: persistedResolution,
        isActive: false,
        createdAt: now,
      }),
      db
        .update(InteractiveStories)
        .set({
          currentNodeId: finalNodeId,
          totalPages: compiledPages.length,
          compiledPages,
          updatedAt: now,
        })
        .where(eq(InteractiveStories.storyId, story.id)),
      db
        .update(Stories)
        .set({
          status: 'published',
          title: story.title,
          coverImage: compiledPages[0]?.imageUrl ?? story.coverImage,
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(Stories.id, story.id)),
      db
        .update(StoryVersions)
        .set({ output: classicOutput })
        .where(
          and(eq(StoryVersions.storyId, story.id), eq(StoryVersions.version, 1))
        ),
      buildStoryAssetsInsert({
        ownerId: story.ownerId,
        storyId: story.id,
        uploads,
      }),
    ]);
  } catch (error) {
    await discardUploadedAssets(uploads);
    throw error;
  }

  const refreshedNodes = await listStoryNodes(story.id, story.storyId);

  return {
    completedSlug: story.slug,
    story: {
      ...story,
      status: 'completed',
      currentNodeId: finalNodeId,
      totalPages: compiledPages.length,
      compiledPages,
    },
    nodes: refreshedNodes,
  };
};

export const continueInteractiveStory = async ({
  userId,
  storyId,
  selectedChoice,
}) => {
  const safeChoice = String(selectedChoice ?? '').trim();
  if (!safeChoice) throw new ApiError(400, 'Selected choice is required');

  const { story } = await ensureOwnedStory({ userId, storyId });
  if (story.status === 'completed')
    throw new ApiError(409, 'Story is already completed');

  const nodes = await listStoryNodes(story.id, story.storyId);
  const activeNode = getActiveNode(nodes);
  if (!activeNode) throw new ApiError(404, 'Active story node not found');
  if (activeNode.selectedChoice)
    throw new ApiError(409, 'This branch is already locked');

  if (Number(activeNode.depth ?? 0) >= MAX_DEPTH) {
    return completeInteractiveStory({
      userId,
      storyId,
      selectedChoice: safeChoice,
    });
  }

  const linearNodes = getLinearNodes({ activeNode, nodes });
  const linearPages = linearNodes.flatMap(node => node.pages ?? []);
  const continuationPrompt = buildContinuationPrompt({
    title: story.title,
    selectedChoice: safeChoice,
    context: makePageContext(linearPages, 6),
    minPages: 3,
    maxPages: 6,
  });

  const continuationText = await generateGeminiText({
    prompt: continuationPrompt,
    mode: 'text',
  });
  const payload = parseContinuationPayload(continuationText);
  const pages = payload.pages.slice(0, 6);
  const choices =
    payload.choices.length >= 2
      ? payload.choices.slice(0, 2)
      : CONTINUATION_FALLBACK_CHOICES;

  if (pages.length < 3) {
    throw new ApiError(502, 'Each continuation must have minimum 3 pages');
  }

  const nextNodeId = randomUUID();
  const { pages: persistedPages, uploads } = await mapGeneratedPages({
    pages,
    pageOffset: linearPages.length,
    seedPrefix: 'branch',
    ownerId: story.ownerId,
    publicStoryId: story.storyId,
  });
  try {
    await db.batch([
      db
        .update(InteractiveStoryNodes)
        .set({ isActive: false, selectedChoice: safeChoice })
        .where(eq(InteractiveStoryNodes.nodeId, activeNode.nodeId)),
      db.insert(InteractiveStoryNodes).values({
        nodeId: nextNodeId,
        storyId: story.id,
        parentNodeId: activeNode.nodeId,
        depth: Number(activeNode.depth ?? 0) + 1,
        choiceTaken: safeChoice,
        choices,
        selectedChoice: null,
        pages: persistedPages,
        isActive: true,
        createdAt: new Date(),
      }),
      db
        .update(InteractiveStories)
        .set({
          currentNodeId: nextNodeId,
          totalPages: linearPages.length + persistedPages.length,
          updatedAt: new Date(),
        })
        .where(eq(InteractiveStories.storyId, story.id)),
      buildStoryAssetsInsert({
        ownerId: story.ownerId,
        storyId: story.id,
        uploads,
      }),
    ]);
  } catch (error) {
    await discardUploadedAssets(uploads);
    throw error;
  }

  const refreshedStory = {
    ...story,
    currentNodeId: nextNodeId,
    totalPages: linearPages.length + persistedPages.length,
  };
  return getInteractiveState(refreshedStory);
};
