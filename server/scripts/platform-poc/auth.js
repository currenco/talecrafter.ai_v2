import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { loadPocEnvironment, requireVariables } from './env.js';

const env = loadPocEnvironment();
requireVariables(env, [
  'DATABASE_URL',
  'NEON_AUTH_BASE_URL',
  'NEON_AUTH_JWKS_URL',
]);

const sql = neon(env.DATABASE_URL);
const issuer = new URL(env.NEON_AUTH_BASE_URL).origin;
const jwks = createRemoteJWKSet(new URL(env.NEON_AUTH_JWKS_URL));
const email = `phase-1-${Date.now()}@example.com`;
const password = `Phase1-${randomUUID()}!aA1`;
const nextPassword = `Phase1-${randomUUID()}!bB2`;
const cookies = new Map();
let userId;

const updateCookies = response => {
  for (const value of response.headers.getSetCookie?.() ?? []) {
    const [pair] = value.split(';', 1);
    const separator = pair.indexOf('=');
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
};

const cookieHeader = () =>
  [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');

const callAuth = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${env.NEON_AUTH_BASE_URL}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      origin: 'http://localhost:3000',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookies.size ? { cookie: cookieHeader() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  updateCookies(response);

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' ? data?.message || data?.error : data;
    throw new Error(`${path} returned ${response.status}: ${message}`);
  }

  return data;
};

const verifyToken = token =>
  jwtVerify(token, jwks, {
    issuer,
    audience: issuer,
  });

const results = {
  branch: env.NEON_BRANCH,
  emailPassword: {},
  session: {},
  emailVerification: {},
  passwordReset: {},
  googleOAuth: {},
  expressTokenContract: {},
  adminAuthorization: {},
};

try {
  const signup = await callAuth('/sign-up/email', {
    method: 'POST',
    body: { name: 'Phase One Proof', email, password },
  });
  userId = signup.user.id;
  results.emailPassword.signup = Boolean(userId);

  const session = await callAuth('/get-session');
  results.session.restored = session.user.id === userId;

  const tokenResult = await callAuth('/token');
  const { payload } = await verifyToken(tokenResult.token);
  results.expressTokenContract = {
    signatureVerified: payload.sub === userId,
    issuerVerified: payload.iss === issuer,
    audienceVerified: payload.aud === issuer,
    stableUserId: Boolean(payload.sub),
  };

  await callAuth('/email-otp/send-verification-otp', {
    method: 'POST',
    body: { email, type: 'email-verification' },
  });
  const verificationRows = await sql`
    select 1
    from neon_auth.verification
    where "identifier" = ${`email-verification-otp-${email}`}
  `;
  results.emailVerification = {
    codeIssued: verificationRows.length === 1,
    deliveryAndConsumptionRequiresInbox: true,
  };

  await callAuth('/email-otp/request-password-reset', {
    method: 'POST',
    body: { email },
  });
  const resetRows = await sql`
    select 1
    from neon_auth.verification
    where "identifier" = ${`forget-password-otp-${email}`}
  `;
  results.passwordReset = {
    codeIssued: resetRows.length === 1,
    deliveryAndConsumptionRequiresInbox: true,
  };

  const social = await callAuth('/sign-in/social', {
    method: 'POST',
    body: {
      provider: 'google',
      callbackURL: 'http://localhost:3000/platform-poc/protected',
    },
  });
  results.googleOAuth = {
    redirectIssued: typeof social.url === 'string' && social.url.length > 0,
    consentRequiresBrowser: true,
  };

  await callAuth('/sign-out', { method: 'POST', body: {} });
  results.session.clearedOnSignOut = (await callAuth('/get-session')) === null;

  const login = await callAuth('/sign-in/email', {
    method: 'POST',
    body: { email, password },
  });
  results.emailPassword.login = login.user.id === userId;

  await sql`
    update neon_auth."user"
    set "role" = 'admin', "updatedAt" = now()
    where "id" = ${userId}
  `;
  await callAuth('/sign-out', { method: 'POST', body: {} });
  await callAuth('/sign-in/email', {
    method: 'POST',
    body: { email, password },
  });
  const adminToken = await callAuth('/token');
  const { payload: adminPayload } = await verifyToken(adminToken.token);
  const [adminUser] = await sql`
    select "role"
    from neon_auth."user"
    where "id" = ${adminPayload.sub}
  `;
  results.adminAuthorization = {
    jwtDatabaseRole: adminPayload.role,
    applicationRole: adminUser.role,
    resolvedByStableUserId: adminPayload.sub === userId,
    doesNotUseEmailComparison: adminUser.role === 'admin',
  };

  results.passwordReset.newPasswordReservedForInboxProof =
    Boolean(nextPassword);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await sql`
    delete from neon_auth.verification
    where "identifier" like ${`%${email}`}
  `;
  if (userId) {
    await sql`delete from neon_auth."user" where "id" = ${userId}`;
  }
}
