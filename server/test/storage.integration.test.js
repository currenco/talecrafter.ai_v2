import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { config } from 'dotenv';

config();
config({ path: new URL('../../.env', import.meta.url), override: true });

const enabled = process.env.RUN_STORAGE_TESTS === 'true';

test(
  'Cloudinary stores and deletes a generated story image',
  { skip: !enabled, timeout: 120_000 },
  async () => {
    const { createCloudinaryStorage } =
      await import('../src/storage/cloudinary.storage.js');
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    const storage = createCloudinaryStorage({
      fetchImpl: async (url, options) => {
        if (new URL(url).hostname === 'image.pollinations.ai') {
          return new globalThis.Response(png, {
            headers: {
              'content-length': String(png.byteLength),
              'content-type': 'image/png',
            },
          });
        }
        return fetch(url, options);
      },
    });
    const objectKey = `phase-4/smoke-${randomUUID()}`;
    let uploaded;

    try {
      uploaded = await storage.uploadFromUrl(
        'https://image.pollinations.ai/prompt/phase-4-storage-smoke-test',
        { objectKey }
      );

      assert.equal(uploaded.provider, 'cloudinary');
      assert.match(uploaded.objectKey, /phase-4\/smoke-/);
      assert.match(uploaded.mimeType, /^image\/(jpeg|png|webp)$/);
      assert.ok(uploaded.byteSize > 0);

      const response = await fetch(uploaded.url);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /^image\//);
    } finally {
      if (uploaded) await storage.deleteObject(uploaded.objectKey);
    }
  }
);
