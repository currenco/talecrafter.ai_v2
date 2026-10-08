import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import {
  apiRateLimit,
  generationStatusRateLimit,
  rateLimitKey,
  isGenerationStatusRequest,
} from '../src/middlewares/rateLimit.middleware.js';
import { getTrustProxy } from '../src/config/proxy.js';

test('identity keys isolate users behind one proxy and normalize anonymous IPv6', () => {
  const req = { ip: '192.0.2.1' };
  assert.notEqual(
    rateLimitKey({ ...req, auth: { userId: 'a' } }),
    rateLimitKey({ ...req, auth: { userId: 'b' } })
  );
  assert.equal(rateLimitKey(req), 'ip:192.0.2.1');
  assert.equal(
    rateLimitKey({ ip: '2001:db8::1' }),
    rateLimitKey({ ip: '2001:db8::2' })
  );
  assert.equal(
    isGenerationStatusRequest({ method: 'POST', path: '/stories/me/a/status' }),
    false
  );
  assert.equal(
    isGenerationStatusRequest({
      method: 'GET',
      path: '/stories/me/a/status/extra',
    }),
    false
  );
});

test('proxy configuration preserves conservative defaults and supports verified allowlists', () => {
  assert.equal(getTrustProxy({ NODE_ENV: 'production' }), 1);
  assert.equal(getTrustProxy({ NODE_ENV: 'test' }), false);
  assert.deepEqual(getTrustProxy({ TRUST_PROXY: '127.0.0.1, 192.0.2.0/24' }), [
    '127.0.0.1',
    '192.0.2.0/24',
  ]);
  assert.throws(() => getTrustProxy({ TRUST_PROXY: 'true' }));
});

test('status exhaustion does not block general reads or another authenticated user', async () => {
  const app = express();
  // Test fixture represents the identity established by JWT verification.
  app.use((req, _res, next) => {
    req.auth = { userId: req.get('x-test-user') ?? 'a' };
    next();
  });
  app.use('/api/v1', apiRateLimit);
  app.get(
    '/api/v1/stories/me/:storyId/status',
    generationStatusRateLimit,
    (_req, res) => res.json({ ok: true })
  );
  app.get('/api/v1/users/me', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const get = async (path, user = 'a') => {
      const response = await fetch(`${base}${path}`, {
        headers: { 'x-test-user': user },
      });
      await response.text();
      return response;
    };
    for (let index = 0; index < 60; index += 1) {
      assert.equal((await get('/stories/me/story/status')).status, 200);
    }
    const blocked = await get('/stories/me/another-story/status');
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    assert.equal((await get('/stories/me/story/status', 'b')).status, 200);
    for (let index = 0; index < 300; index += 1) {
      assert.equal((await get('/users/me')).status, 200);
    }
    assert.equal((await get('/users/me')).status, 429);
    assert.equal((await get('/users/me', 'b')).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
