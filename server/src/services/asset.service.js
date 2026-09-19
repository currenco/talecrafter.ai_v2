import { randomUUID } from 'node:crypto';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { Assets } from '../db/schema.js';
import { getObjectStorage } from '../storage/index.js';
import ApiError from '../utils/ApiError.js';

const normalizePathPart = value =>
  String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const buildAssetObjectKey = ({
  ownerId,
  publicStoryId,
  assetId,
  purpose,
}) => {
  const owner = normalizePathPart(ownerId);
  const id = normalizePathPart(assetId);
  const label = normalizePathPart(purpose) || 'image';

  if (!owner || !id) throw new ApiError(400, 'Asset path identity is required');

  if (publicStoryId) {
    return `users/${owner}/stories/${normalizePathPart(publicStoryId)}/${label}-${id}`;
  }

  return `users/${owner}/uploads/${label}-${id}`;
};

const uploadOne = async ({ ownerId, publicStoryId, sourceUrl, purpose }) => {
  const storage = getObjectStorage();
  const id = randomUUID();
  const uploaded = await storage.uploadFromUrl(sourceUrl, {
    objectKey: buildAssetObjectKey({
      ownerId,
      publicStoryId,
      assetId: id,
      purpose,
    }),
  });

  return {
    id,
    provider: uploaded.provider,
    bucket: uploaded.container,
    objectKey: uploaded.objectKey,
    access: 'public',
    mimeType: uploaded.mimeType,
    byteSize: uploaded.byteSize,
    status: 'ready',
    url: uploaded.url,
  };
};

export const discardUploadedAssets = async uploads => {
  const items = Array.isArray(uploads) ? uploads.filter(Boolean) : [];
  if (!items.length) return;

  const ids = items.map(item => item.id).filter(Boolean);
  if (ids.length) {
    await db
      .delete(Assets)
      .where(inArray(Assets.id, ids))
      .catch(() => undefined);
  }

  const storage = getObjectStorage();
  await Promise.allSettled(
    items.map(item => storage.deleteObject(item.objectKey))
  );
};

export const uploadAssetBatch = async ({
  ownerId,
  publicStoryId,
  images,
  concurrency = 3,
}) => {
  const requests = Array.isArray(images) ? images : [];
  const results = new Array(requests.length);
  let cursor = 0;

  const workers = Array.from(
    {
      length: Math.min(Math.max(1, concurrency), Math.max(1, requests.length)),
    },
    async () => {
      while (cursor < requests.length) {
        const index = cursor;
        cursor += 1;
        try {
          results[index] = {
            status: 'fulfilled',
            value: await uploadOne({
              ownerId,
              publicStoryId,
              ...requests[index],
            }),
          };
        } catch (reason) {
          results[index] = { status: 'rejected', reason };
        }
      }
    }
  );

  await Promise.all(workers);

  const uploaded = results
    .filter(result => result?.status === 'fulfilled')
    .map(result => result.value);
  const failed = results.find(result => result?.status === 'rejected');

  if (failed) {
    await discardUploadedAssets(uploaded);
    throw failed.reason;
  }

  return uploaded;
};

export const recordStoryAssets = async ({ ownerId, storyId, uploads }) => {
  const items = Array.isArray(uploads) ? uploads : [];
  if (!items.length) return [];

  return buildStoryAssetsInsert({ ownerId, storyId, uploads: items });
};

export const buildStoryAssetsInsert = ({ ownerId, storyId, uploads }) =>
  db
    .insert(Assets)
    .values(
      uploads.map(item => ({
        id: item.id,
        ownerId,
        storyId,
        provider: item.provider,
        bucket: item.bucket,
        objectKey: item.objectKey,
        access: item.access,
        mimeType: item.mimeType,
        byteSize: item.byteSize,
        status: item.status,
      }))
    )
    .returning({ id: Assets.id });

export const persistStandaloneAsset = async ({ ownerId, sourceUrl }) => {
  const [upload] = await uploadAssetBatch({
    ownerId,
    images: [{ sourceUrl, purpose: 'story-reference' }],
  });

  try {
    await recordStoryAssets({ ownerId, storyId: null, uploads: [upload] });
    return upload;
  } catch (error) {
    await discardUploadedAssets([upload]);
    throw error;
  }
};

const deleteAssets = async condition => {
  const assets = await db
    .select({
      id: Assets.id,
      provider: Assets.provider,
      objectKey: Assets.objectKey,
    })
    .from(Assets)
    .where(and(condition, ne(Assets.status, 'deleted')));

  if (!assets.length) return { deleted: 0 };

  const storage = getObjectStorage();
  const foreignProvider = assets.find(
    asset => asset.provider !== storage.provider
  );
  if (foreignProvider) {
    throw new ApiError(
      500,
      `No storage adapter is configured for ${foreignProvider.provider}`
    );
  }

  const results = await Promise.allSettled(
    assets.map(asset => storage.deleteObject(asset.objectKey))
  );
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;

  await db
    .update(Assets)
    .set({ status: 'deleted', updatedAt: new Date() })
    .where(
      inArray(
        Assets.id,
        assets.map(asset => asset.id)
      )
    );

  return { deleted: assets.length };
};

export const deleteStoryAssets = storyId =>
  deleteAssets(eq(Assets.storyId, storyId));

export const deleteUserAssets = ownerId =>
  deleteAssets(eq(Assets.ownerId, ownerId));
