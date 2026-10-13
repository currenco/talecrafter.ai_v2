import { z } from 'zod';

const optionalString = z.string().trim().optional();

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required'),
  NEON_AUTH_BASE_URL: optionalString,
  NEON_AUTH_JWKS_URL: optionalString,
  CORS_ORIGIN: optionalString,
  CLIENT_ORIGIN: optionalString,
  GEMINI_API_KEY: optionalString,
  POLLINATIONS_APP_KEY: optionalString,
  POLLINATIONS_IMAGE_MODEL: optionalString,
  POLLINATIONS_TOKEN_ENCRYPTION_KEY: optionalString,
  POLLINATIONS_PLATFORM_KEY: optionalString,
  POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT: z.preprocess(
    value => (value === '' ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
  CREATOR_CHECKOUT_ENABLED: z.enum(['true', 'false']).default('false'),
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  RAZORPAY_CREATOR_PLAN_ID: optionalString,
});

const productionRequired = [
  'NEON_AUTH_BASE_URL',
  'NEON_AUTH_JWKS_URL',
  'CORS_ORIGIN',
  'CLIENT_ORIGIN',
  'GEMINI_API_KEY',
  'POLLINATIONS_APP_KEY',
  'POLLINATIONS_TOKEN_ENCRYPTION_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

export const creatorCheckoutEnabled = (source = process.env) =>
  Boolean(
    source.CREATOR_CHECKOUT_ENABLED === 'true' &&
    source.RAZORPAY_KEY_ID &&
    source.RAZORPAY_KEY_SECRET &&
    source.RAZORPAY_WEBHOOK_SECRET &&
    source.RAZORPAY_CREATOR_PLAN_ID &&
    source.POLLINATIONS_PLATFORM_KEY &&
    Number(source.POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT) > 0
  );

const isHttpUrl = value => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateEnvironment = (source = process.env) => {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid server environment: ${details}`);
  }

  const env = result.data;
  const issues = [];
  if (
    env.POLLINATIONS_PLATFORM_KEY &&
    !env.POLLINATIONS_PLATFORM_KEY.startsWith('sk_')
  ) {
    issues.push('POLLINATIONS_PLATFORM_KEY must start with sk_');
  }
  if (env.CREATOR_CHECKOUT_ENABLED === 'true') {
    for (const name of [
      'POLLINATIONS_PLATFORM_KEY',
      'POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT',
      'RAZORPAY_CREATOR_PLAN_ID',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
    ]) {
      if (!env[name])
        issues.push(`${name} is required to enable Creator checkout`);
    }
  }

  if (env.NODE_ENV === 'production') {
    for (const name of productionRequired) {
      if (!env[name]) issues.push(`${name} is required in production`);
    }
  }

  const origins = String(env.CORS_ORIGIN ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (origins.some(origin => !isHttpUrl(origin))) {
    issues.push('CORS_ORIGIN must contain comma-separated http(s) URLs');
  }

  if (env.CLIENT_ORIGIN && !isHttpUrl(env.CLIENT_ORIGIN)) {
    issues.push('CLIENT_ORIGIN must be an http(s) URL');
  }

  if (env.NEON_AUTH_BASE_URL && !isHttpUrl(env.NEON_AUTH_BASE_URL)) {
    issues.push('NEON_AUTH_BASE_URL must be an http(s) URL');
  }

  if (env.NEON_AUTH_JWKS_URL && !isHttpUrl(env.NEON_AUTH_JWKS_URL)) {
    issues.push('NEON_AUTH_JWKS_URL must be an http(s) URL');
  }

  if (env.POLLINATIONS_APP_KEY && !env.POLLINATIONS_APP_KEY.startsWith('pk_')) {
    issues.push('POLLINATIONS_APP_KEY must start with pk_');
  }

  if (
    env.POLLINATIONS_TOKEN_ENCRYPTION_KEY &&
    env.POLLINATIONS_TOKEN_ENCRYPTION_KEY.length < 32
  ) {
    issues.push(
      'POLLINATIONS_TOKEN_ENCRYPTION_KEY must be at least 32 characters'
    );
  }

  if (env.RAZORPAY_KEY_ID && !env.RAZORPAY_KEY_ID.startsWith('rzp_')) {
    issues.push('RAZORPAY_KEY_ID must start with rzp_');
  }

  if (env.RAZORPAY_WEBHOOK_SECRET && env.RAZORPAY_WEBHOOK_SECRET.length < 32) {
    issues.push('RAZORPAY_WEBHOOK_SECRET must be at least 32 characters');
  }

  if (issues.length) {
    throw new Error(`Invalid server environment: ${issues.join('; ')}`);
  }

  return env;
};
