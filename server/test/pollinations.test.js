import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPollinationsImageRequest,
  buildPollinationsImageUrl,
} from '../src/services/image.service.js';
import { decryptSecret, encryptSecret } from '../src/utils/secretBox.js';

test('Pollinations image requests keep user credentials out of URLs', () => {
  const request = buildPollinationsImageRequest(
    'A moonlit storybook castle',
    'sk_user_secret',
    { width: 1024, height: 1024, seed: 42 }
  );

  assert.match(request.sourceUrl, /^https:\/\/gen\.pollinations\.ai\/image\//);
  assert.equal(new URL(request.sourceUrl).searchParams.has('key'), false);
  assert.equal(request.sourceHeaders.Authorization, 'Bearer sk_user_secret');
});

test('Pollinations image URLs use the configured model', () => {
  const previous = process.env.POLLINATIONS_IMAGE_MODEL;
  process.env.POLLINATIONS_IMAGE_MODEL = 'test/image-model';
  try {
    const url = new URL(buildPollinationsImageUrl('story image'));
    assert.equal(url.searchParams.get('model'), 'test/image-model');
  } finally {
    if (previous === undefined) delete process.env.POLLINATIONS_IMAGE_MODEL;
    else process.env.POLLINATIONS_IMAGE_MODEL = previous;
  }
});

test('Pollinations credentials are authenticated encrypted envelopes', () => {
  const previous = process.env.POLLINATIONS_TOKEN_ENCRYPTION_KEY;
  process.env.POLLINATIONS_TOKEN_ENCRYPTION_KEY = 'x'.repeat(32);
  try {
    const encrypted = encryptSecret('sk_sensitive_token');
    assert.notEqual(encrypted, 'sk_sensitive_token');
    assert.equal(decryptSecret(encrypted), 'sk_sensitive_token');
    assert.throws(() => decryptSecret(`${encrypted}tampered`));
  } finally {
    if (previous === undefined)
      delete process.env.POLLINATIONS_TOKEN_ENCRYPTION_KEY;
    else process.env.POLLINATIONS_TOKEN_ENCRYPTION_KEY = previous;
  }
});
