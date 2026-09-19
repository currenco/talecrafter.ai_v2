import assert from 'node:assert/strict';
import test from 'node:test';
import { createCloudinaryStorage } from '../src/storage/cloudinary.storage.js';
import { assertObjectStorage } from '../src/storage/objectStorage.js';

const config = {
  cloudName: 'test-cloud',
  apiKey: 'test-key',
  apiSecret: 'test-secret',
  folder: 'test-assets',
};

const imageResponse = (body = new Uint8Array([1, 2, 3, 4]), headers = {}) =>
  new globalThis.Response(body, {
    status: 200,
    headers: {
      'content-length': String(body.byteLength),
      'content-type': 'image/png',
      ...headers,
    },
  });

const rejectsWithStatus = statusCode => error => {
  assert.equal(error.statusCode, statusCode);
  return true;
};

test('Cloudinary adapter uploads an allowed source with a stable object key', async () => {
  const calls = [];
  const storage = createCloudinaryStorage({
    config,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (calls.length === 1) return imageResponse();
      return globalThis.Response.json({
        public_id: 'test-assets/users/user/story/cover-id',
        secure_url:
          'https://res.cloudinary.com/test-cloud/image/upload/test-assets/users/user/story/cover-id.png',
        bytes: 4,
      });
    },
  });

  const uploaded = await storage.uploadFromUrl(
    'https://image.pollinations.ai/prompt/story',
    { objectKey: 'users/user/story/cover-id' }
  );

  assert.equal(uploaded.provider, 'cloudinary');
  assert.equal(uploaded.container, 'test-cloud');
  assert.equal(uploaded.objectKey, 'test-assets/users/user/story/cover-id');
  assert.equal(uploaded.mimeType, 'image/png');
  assert.equal(uploaded.byteSize, 4);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, 'POST');
});

test('Cloudinary adapter rejects untrusted and insecure source URLs', async () => {
  const storage = createCloudinaryStorage({
    config,
    fetchImpl: async () => assert.fail('fetch must not be called'),
  });

  await assert.rejects(
    storage.uploadFromUrl('https://example.com/image.png', {
      objectKey: 'key',
    }),
    rejectsWithStatus(400)
  );
  await assert.rejects(
    storage.uploadFromUrl('http://image.pollinations.ai/prompt/story', {
      objectKey: 'key',
    }),
    rejectsWithStatus(400)
  );
});

test('Cloudinary adapter rejects unsupported and oversized source images', async () => {
  const unsupported = createCloudinaryStorage({
    config,
    fetchImpl: async () =>
      imageResponse(new Uint8Array([1]), { 'content-type': 'image/gif' }),
  });
  await assert.rejects(
    unsupported.uploadFromUrl('https://image.pollinations.ai/prompt/story', {
      objectKey: 'key',
    }),
    rejectsWithStatus(415)
  );

  const oversized = createCloudinaryStorage({
    config,
    maxSourceBytes: 3,
    fetchImpl: async () => imageResponse(),
  });
  await assert.rejects(
    oversized.uploadFromUrl('https://image.pollinations.ai/prompt/story', {
      objectKey: 'key',
    }),
    rejectsWithStatus(413)
  );
});

test('Cloudinary adapter normalizes source timeouts and provider failures', async () => {
  const timedOut = createCloudinaryStorage({
    config,
    fetchImpl: async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new globalThis.DOMException('Aborted', 'AbortError'));
        });
      }),
  });
  await assert.rejects(
    timedOut.uploadFromUrl('https://image.pollinations.ai/prompt/story', {
      objectKey: 'key',
      sourceTimeoutMs: 1,
    }),
    rejectsWithStatus(504)
  );

  let call = 0;
  const providerFailure = createCloudinaryStorage({
    config,
    fetchImpl: async () => {
      call += 1;
      return call === 1
        ? imageResponse()
        : new globalThis.Response('unavailable', { status: 503 });
    },
  });
  await assert.rejects(
    providerFailure.uploadFromUrl(
      'https://image.pollinations.ai/prompt/story',
      { objectKey: 'key' }
    ),
    rejectsWithStatus(502)
  );
});

test('Cloudinary adapter accepts idempotent deletion and rejects failures', async () => {
  const deleted = createCloudinaryStorage({
    config,
    destroyImpl: async () => ({ result: 'ok' }),
  });
  assert.deepEqual(await deleted.deleteObject('asset-key'), {
    objectKey: 'asset-key',
    deleted: true,
  });

  const missing = createCloudinaryStorage({
    config,
    destroyImpl: async () => ({ result: 'not found' }),
  });
  assert.equal((await missing.deleteObject('asset-key')).deleted, false);

  const failed = createCloudinaryStorage({
    config,
    destroyImpl: async () => ({ result: 'error' }),
  });
  await assert.rejects(
    failed.deleteObject('asset-key'),
    rejectsWithStatus(502)
  );
});

test('object storage contract rejects incomplete adapters', () => {
  assert.throws(
    () =>
      assertObjectStorage({
        provider: 'test',
        container: 'test',
        uploadFromUrl: async () => {},
      }),
    /getPublicUrl/
  );
});
