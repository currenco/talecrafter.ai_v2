import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { listSitemapStories } from '../services/seo.service.js';
import {
  createClassicStory,
  deleteCurrentUserStory,
  getCurrentUserStoryStatus,
  getStoryBySlug,
  getStoryByStoryId,
  listCurrentUserStories,
  listPublicStories,
  listPublicGenres,
  listRelatedStories,
  resumeClassicStory,
} from '../services/story.service.js';
import ApiError from '../utils/ApiError.js';
import { getIdempotencyKey } from '../utils/idempotency.js';
import { publicStory } from '../utils/publicStory.js';
import { syncUserFromAuth } from '../services/user.service.js';
import { subscribeStoryProgress } from '../utils/storyProgress.js';

export const streamStoryGeneration = asyncHandler(async (req, res) => {
  const user = await syncUserFromAuth(req.auth.userId);
  const options = { profileId: user.id, storyId: req.params.storyId };
  // Authenticate ownership before opening a stream; never send another user's draft.
  await getCurrentUserStoryStatus(options);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'private, no-store, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  let closed = false;
  let reading = false;
  let dirty = false;
  const refresh = async () => {
    dirty = true;
    if (reading || closed) return;
    reading = true;
    try {
      while (dirty && !closed) {
        dirty = false;
        const progress = await getCurrentUserStoryStatus(options);
        if (closed) break;
        if (!res.write(`data: ${JSON.stringify(progress)}\n\n`)) {
          await new Promise(resolve => {
            const ready = () => {
              res.off('drain', ready);
              res.off('close', ready);
              resolve();
            };
            res.once('drain', ready);
            res.once('close', ready);
          });
        }
        if (progress.generationStatus !== 'running') {
          res.end();
          break;
        }
      }
    } catch {
      if (!closed) {
        res.write(
          'event: error\ndata: {"message":"Progress connection interrupted"}\n\n'
        );
        res.end();
      }
    } finally {
      reading = false;
    }
  };
  const unsubscribe = subscribeStoryProgress(req.params.storyId, refresh);
  const heartbeat = setInterval(() => {
    if (!closed) res.write(': heartbeat\n\n');
  }, 15000);
  const expiry = setTimeout(() => res.end(), 12 * 60 * 1000);
  res.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(expiry);
    unsubscribe();
  });
  // Read after subscribing so a save during connection setup cannot be missed.
  await refresh();
});

export const getCreatorPack = asyncHandler(async (req, res) => {
  const user = await syncUserFromAuth(req.auth.userId);
  if (!user.canExport)
    throw new ApiError(403, 'Creator subscription required', [
      { code: 'CREATOR_REQUIRED' },
    ]);
  const story = await getStoryByStoryId(req.params.storyId);
  if (!story) throw new ApiError(404, 'Published story not found');
  res.set('Cache-Control', 'private, no-store');
  return res.json(
    new ApiResponse(
      200,
      {
        title: story.output?.title ?? story.title,
        settings: {
          subject: story.storySubject,
          genre: story.storyType,
          ageGroup: story.ageGroup,
          artStyle: story.imageStyle,
          format: story.kind === 'interactive' ? 'Plot Twist' : 'Classic',
        },
        characters: story.output?.characterDescriptions ?? {},
        scenes: story.output?.chapters ?? [],
      },
      'Creator story pack'
    )
  );
});

export const getPublicStories = asyncHandler(async (req, res) => {
  if (req.authError) throw req.authError;
  res.set('Cache-Control', 'private, no-store');
  const stories = await listPublicStories({
    ...req.validated.query,
    preview: !req.auth?.userId,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, stories.map(publicStory), 'Stories fetched'));
});

export const getPublicGenres = asyncHandler(async (_req, res) => {
  const genres = await listPublicGenres();
  return res.json(new ApiResponse(200, genres, 'Genres fetched'));
});

export const getSitemapStories = asyncHandler(async (req, res) => {
  const entries = await listSitemapStories(req.validated.query.page);
  res.set('Cache-Control', 'public, max-age=300');
  return res.json(new ApiResponse(200, entries, 'Sitemap entries fetched'));
});

export const getCurrentUserStories = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const stories = await listCurrentUserStories({
    userId: req.auth.userId,
    ...req.validated.query,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...stories, items: stories.items.map(publicStory) },
        'Stories fetched'
      )
    );
});

export const getStorySlugDetail = asyncHandler(async (req, res) => {
  const story = await getStoryBySlug(req.params.slug);
  if (!story) throw new ApiError(404, 'Story not found');
  return res
    .status(200)
    .json(new ApiResponse(200, publicStory(story), 'Story fetched'));
});

export const getStoryIdDetail = asyncHandler(async (req, res) => {
  const story = await getStoryByStoryId(req.params.storyId);
  if (!story) throw new ApiError(404, 'Story not found');
  return res
    .status(200)
    .json(new ApiResponse(200, publicStory(story), 'Story fetched'));
});

export const getRelatedStoryList = asyncHandler(async (req, res) => {
  const result = await listRelatedStories({
    storyId: req.params.storyId,
    storyType: req.query.storyType,
    limit: req.query.limit,
    offset: req.query.offset,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...result, stories: result.stories.map(publicStory) },
        'Related stories fetched'
      )
    );
});

export const deleteStory = asyncHandler(async (req, res) => {
  const story = await deleteCurrentUserStory({
    userId: req.auth.userId,
    storyId: req.params.storyId,
  });
  return res.status(200).json(new ApiResponse(200, story, 'Story deleted'));
});

export const createStory = asyncHandler(async (req, res) => {
  const story = await createClassicStory({
    userId: req.auth.userId,
    idempotencyKey: getIdempotencyKey(req),
    payload: req.validated.body,
  });

  return res
    .status(202)
    .json(new ApiResponse(202, story, 'Story draft created'));
});

export const getStoryGenerationStatus = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const status = await getCurrentUserStoryStatus({
    userId: req.auth.userId,
    storyId: req.params.storyId,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, status, 'Story status fetched'));
});

export const resumeStoryGeneration = asyncHandler(async (req, res) => {
  const story = await resumeClassicStory({
    userId: req.auth.userId,
    storyId: req.params.storyId,
    idempotencyKey: getIdempotencyKey(req),
  });
  return res
    .status(202)
    .json(new ApiResponse(202, story, 'Story generation resumed'));
});
