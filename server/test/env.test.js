import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnvironment } from '../src/config/env.js';

const baseEnvironment = {
  NODE_ENV: 'development',
  PORT: '8000',
  DATABASE_URL: 'postgresql://user:password@example.com/database',
  NEON_AUTH_BASE_URL: 'https://auth.example.com/api/auth',
  NEON_AUTH_JWKS_URL: 'https://auth.example.com/.well-known/jwks.json',
};

test('accepts a valid development environment', () => {
  const env = validateEnvironment(baseEnvironment);
  assert.equal(env.PORT, 8000);
  assert.equal(env.NODE_ENV, 'development');
});

test('rejects an invalid client origin', () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...baseEnvironment,
        CLIENT_ORIGIN: 'javascript:alert(1)',
      }),
    /CLIENT_ORIGIN/
  );
});

test('rejects invalid Neon Auth URLs', () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...baseEnvironment,
        NEON_AUTH_BASE_URL: 'not-a-url',
      }),
    /NEON_AUTH_BASE_URL must be an http\(s\) URL/
  );
});

test('requires service configuration in production', () => {
  assert.throws(
    () => validateEnvironment({ ...baseEnvironment, NODE_ENV: 'production' }),
    /STRIPE_SECRET_KEY is required in production/
  );
});

test('validates Pollinations application credentials', () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...baseEnvironment,
        POLLINATIONS_APP_KEY: 'sk_not-an-app-key',
      }),
    /POLLINATIONS_APP_KEY must start with pk_/
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...baseEnvironment,
        POLLINATIONS_TOKEN_ENCRYPTION_KEY: 'too-short',
      }),
    /at least 32 characters/
  );
});
