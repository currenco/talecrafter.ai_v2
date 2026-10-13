import test from 'node:test';
import assert from 'node:assert/strict';
import {
  creatorCheckoutEnabled,
  validateEnvironment,
} from '../src/config/env.js';

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

test('Creator checkout stays disabled until billing and platform funding are configured', () => {
  assert.equal(
    validateEnvironment(baseEnvironment).CREATOR_CHECKOUT_ENABLED,
    'false'
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...baseEnvironment,
        CREATOR_CHECKOUT_ENABLED: 'true',
      }),
    /required to enable Creator checkout/
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...baseEnvironment,
        POLLINATIONS_PLATFORM_KEY: 'pk_public',
      }),
    /must start with sk_/
  );
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
    /CORS_ORIGIN is required in production/
  );
});

test('production Free launch needs no billing or platform-funded image credentials', () => {
  const source = {
    ...baseEnvironment,
    NODE_ENV: 'production',
    CLIENT_ORIGIN: 'https://example.com',
    CORS_ORIGIN: 'https://example.com',
    GEMINI_API_KEY: 'test',
    POLLINATIONS_APP_KEY: 'pk_test',
    POLLINATIONS_TOKEN_ENCRYPTION_KEY: 'x'.repeat(32),
    CLOUDINARY_CLOUD_NAME: 'test',
    CLOUDINARY_API_KEY: 'test',
    CLOUDINARY_API_SECRET: 'test',
    POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT: '',
    CREATOR_CHECKOUT_ENABLED: 'false',
  };
  assert.equal(validateEnvironment(source).CREATOR_CHECKOUT_ENABLED, 'false');
  assert.equal(creatorCheckoutEnabled(source), false);
  assert.throws(
    () => validateEnvironment({ ...source, CREATOR_CHECKOUT_ENABLED: 'true' }),
    /required to enable Creator checkout/
  );
  assert.equal(
    creatorCheckoutEnabled({ ...source, CREATOR_CHECKOUT_ENABLED: 'true' }),
    false
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

test('validates Razorpay key IDs', () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...baseEnvironment,
        RAZORPAY_KEY_ID: 'invalid-key',
      }),
    /RAZORPAY_KEY_ID must start with rzp_/
  );

  assert.throws(
    () =>
      validateEnvironment({
        ...baseEnvironment,
        RAZORPAY_WEBHOOK_SECRET: 'too-short',
      }),
    /RAZORPAY_WEBHOOK_SECRET must be at least 32 characters/
  );
});
