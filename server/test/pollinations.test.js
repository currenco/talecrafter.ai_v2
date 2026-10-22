import assert from 'node:assert/strict';
import test from 'node:test';
import { runImageTasks, createSerialWriter } from '../src/utils/imageTasks.js';
import {
  publishStoryProgress,
  subscribeStoryProgress,
} from '../src/utils/storyProgress.js';

test('image workers overlap two tasks but serialize durable updates', async () => {
  let active = 0;
  let peak = 0;
  let writers = 0;
  const saved = [];
  const persist = createSerialWriter();
  await runImageTasks([1, 2, 3, 4], async value => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    await persist(async () => {
      assert.equal(writers++, 0);
      await new Promise(resolve => setTimeout(resolve, 2));
      saved.push(value);
      writers -= 1;
    });
    active -= 1;
  });
  assert.equal(peak, 2);
  assert.deepEqual(saved.sort(), [1, 2, 3, 4]);
});

test('a failed image stops scheduling while in-flight successes finish saving', async () => {
  const started = [];
  const saved = [];
  await assert.rejects(
    runImageTasks([1, 2, 3, 4], async value => {
      started.push(value);
      if (value === 1) throw new Error('provider budget');
      await new Promise(resolve => setTimeout(resolve, 5));
      saved.push(value);
    }),
    /provider budget/
  );
  assert.deepEqual(started, [1, 2]);
  assert.deepEqual(saved, [2]);
});

test('progress notifications are scoped and unsubscribe cleanly', () => {
  let count = 0;
  const unsubscribe = subscribeStoryProgress('one', () => count++);
  publishStoryProgress('other');
  assert.equal(count, 0);
  publishStoryProgress('one');
  assert.equal(count, 1);
  unsubscribe();
  publishStoryProgress('one');
  assert.equal(count, 1);
});
import {
  buildPollinationsImageRequest,
  buildPollinationsImageUrl,
  normalizeGeneratedSource,
} from '../src/services/image.service.js';
import { decryptSecret, encryptSecret } from '../src/utils/secretBox.js';
import { hasImagePermission } from '../src/utils/pollinationsPermissions.js';
import {
  isPollinationsBalanceExhausted,
  imageFundingError,
} from '../src/utils/pollinationsBalance.js';

test('only a known empty account or key budget signals exhaustion', () => {
  for (const balance of [
    null,
    {},
    { balance: null },
    { balance: '0' },
    { balance: NaN },
    { balance: 1 },
  ]) {
    assert.equal(isPollinationsBalanceExhausted(balance), false);
  }
  for (const balance of [
    { balance: 0 },
    { balance: -1 },
    { balance: 5, accountBalance: { total: 0 } },
  ]) {
    assert.equal(isPollinationsBalanceExhausted(balance), true);
  }
});

test('only personal image funding failures offer an upgrade', () => {
  assert.equal(imageFundingError('free').statusCode, 402);
  assert.equal(
    imageFundingError('free').error[0].code,
    'POLLINATIONS_BALANCE_EXHAUSTED'
  );
  assert.equal(imageFundingError('creator').statusCode, 503);
  assert.equal(
    imageFundingError('creator').error[0].code,
    'PLATFORM_IMAGE_UNAVAILABLE'
  );
});

test('generated persistence URLs cannot override model, dimensions or billing parameters', () => {
  const normalized = new URL(
    normalizeGeneratedSource(
      'https://gen.pollinations.ai/image/castle?model=expensive&width=4096&height=4096&quality=high&key=secret'
    )
  );
  assert.equal(
    normalized.searchParams.get('model'),
    process.env.POLLINATIONS_IMAGE_MODEL ?? 'black-forest-labs/flux.1-schnell'
  );
  assert.equal(normalized.searchParams.get('width'), '1024');
  assert.equal(normalized.searchParams.has('quality'), false);
  assert.equal(normalized.searchParams.has('key'), false);
});

test('Pollinations accepts image categories, unrestricted and legacy model grants', () => {
  const model = 'black-forest-labs/flux.1-schnell';
  for (const models of [null, ['image'], ['text', 'image'], [model]]) {
    assert.equal(hasImagePermission({ permissions: { models } }, model), true);
  }
});

test('Pollinations rejects missing, malformed and unrelated image permissions', () => {
  const model = 'black-forest-labs/flux.1-schnell';
  for (const models of [
    undefined,
    [],
    ['text'],
    ['video'],
    ['another/image-model'],
    'image',
    {},
    [null],
  ]) {
    assert.equal(hasImagePermission({ permissions: { models } }, model), false);
  }
  for (const details of [null, undefined, {}, { permissions: null }]) {
    assert.equal(hasImagePermission(details, model), false);
  }
  assert.equal(
    hasImagePermission({ permissions: { models: [''] } }, ''),
    false
  );
});

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
