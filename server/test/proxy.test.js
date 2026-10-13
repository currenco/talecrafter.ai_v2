import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrustProxy } from '../src/config/proxy.js';

test('proxy configuration preserves conservative defaults and supports verified allowlists', () => {
  assert.equal(getTrustProxy({ NODE_ENV: 'production' }), 1);
  assert.equal(getTrustProxy({ NODE_ENV: 'test' }), false);
  assert.deepEqual(getTrustProxy({ TRUST_PROXY: '127.0.0.1, 192.0.2.0/24' }), [
    '127.0.0.1',
    '192.0.2.0/24',
  ]);
  assert.throws(() => getTrustProxy({ TRUST_PROXY: 'true' }));
});
