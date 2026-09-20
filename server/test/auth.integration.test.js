import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';

config();
process.env.DATABASE_URL =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';

const enabled = process.env.RUN_AUTH_TESTS === 'true';

const createAuthSession = baseUrl => {
  const cookies = new Map();

  const updateCookies = response => {
    for (const value of response.headers.getSetCookie?.() ?? []) {
      const [pair] = value.split(';', 1);
      const separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  };

  const call = async (path, { method = 'GET', body } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      redirect: 'manual',
      headers: {
        origin: 'http://localhost:3000',
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(cookies.size
          ? {
              cookie: [...cookies.entries()]
                .map(([name, value]) => `${name}=${value}`)
                .join('; '),
            }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    updateCookies(response);

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    assert.equal(
      response.ok,
      true,
      `${path} returned ${response.status}: ${text}`
    );
    return data;
  };

  return { call };
};

test(
  'Neon Auth protects the API with stable identity and application roles',
  { skip: !enabled, timeout: 60_000 },
  async () => {
    assert.match(String(process.env.NEON_BRANCH ?? ''), /^dev\//);
    assert.ok(process.env.NEON_AUTH_BASE_URL);
    assert.ok(process.env.NEON_AUTH_JWKS_URL);

    const [{ default: app }, { db }, schema, { eq, sql }] = await Promise.all([
      import('../src/app.js'),
      import('../src/db/index.js'),
      import('../src/db/schema.js'),
      import('drizzle-orm'),
    ]);
    const { Stories, UserProfiles } = schema;
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const address = server.address();
    const apiBase = `http://127.0.0.1:${address.port}/api/v1`;
    const suffix = randomUUID();
    const password = `Phase3-${randomUUID()}!aA1`;
    const users = [
      {
        name: 'Phase Three Owner',
        email: `phase-3-owner-${suffix}@example.com`,
      },
      {
        name: 'Phase Three Other',
        email: `phase-3-other-${suffix}@example.com`,
      },
    ];
    const authSessions = users.map(() =>
      createAuthSession(process.env.NEON_AUTH_BASE_URL)
    );
    const authUserIds = [];
    const profileIds = [];

    const apiCall = async (path, { token, origin, method = 'GET' } = {}) => {
      const response = await fetch(`${apiBase}${path}`, {
        method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(origin ? { origin } : {}),
        },
      });
      return {
        response,
        body: await response.json().catch(() => null),
      };
    };

    try {
      const unauthorized = await apiCall('/users/me');
      assert.equal(unauthorized.response.status, 401);

      const invalidToken = await apiCall('/users/me', {
        token: 'expired-or-invalid-token',
      });
      assert.equal(invalidToken.response.status, 401);

      const tokens = [];
      for (let index = 0; index < users.length; index += 1) {
        const signup = await authSessions[index].call('/sign-up/email', {
          method: 'POST',
          body: { ...users[index], password },
        });
        authUserIds.push(signup.user.id);

        const token = await authSessions[index].call('/token');
        tokens.push(token.token);

        const current = await apiCall('/users/me', { token: token.token });
        assert.equal(current.response.status, 200);
        assert.equal(current.body.data.authUserId, signup.user.id);
        assert.equal(current.body.data.userEmail, users[index].email);
        profileIds.push(current.body.data.id);
      }

      await authSessions[0].call('/email-otp/send-verification-otp', {
        method: 'POST',
        body: { email: users[0].email, type: 'email-verification' },
      });
      await authSessions[0].call('/email-otp/request-password-reset', {
        method: 'POST',
        body: { email: users[0].email },
      });

      const social = await authSessions[0].call('/sign-in/social', {
        method: 'POST',
        body: {
          provider: 'google',
          callbackURL: 'http://localhost:3000/dashboard',
        },
      });
      assert.match(social.url, /^https:\/\//);

      const deniedAdmin = await apiCall('/admin/users', { token: tokens[0] });
      assert.equal(deniedAdmin.response.status, 403);

      await db
        .update(UserProfiles)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(UserProfiles.id, profileIds[0]));
      const allowedAdmin = await apiCall('/admin/users', { token: tokens[0] });
      assert.equal(allowedAdmin.response.status, 200);

      const storyPublicId = randomUUID();
      await db.insert(Stories).values({
        storyId: storyPublicId,
        ownerId: profileIds[0],
        slug: `phase-3-${suffix}`,
        title: 'Phase Three Ownership Test',
      });

      const crossUserDelete = await apiCall(`/stories/${storyPublicId}`, {
        method: 'DELETE',
        token: tokens[1],
      });
      assert.equal(crossUserDelete.response.status, 404);
      const ownerDelete = await apiCall(`/stories/${storyPublicId}`, {
        method: 'DELETE',
        token: tokens[0],
      });
      assert.equal(ownerDelete.response.status, 200);

      const allowedCors = await apiCall('/health', {
        origin: 'http://localhost:3001',
      });
      assert.equal(
        allowedCors.response.headers.get('access-control-allow-origin'),
        'http://localhost:3001'
      );
      const deniedCors = await apiCall('/health', {
        origin: 'https://untrusted.example',
      });
      assert.equal(deniedCors.response.status, 403);

      await authSessions[0].call('/sign-out', { method: 'POST', body: {} });
      assert.equal(await authSessions[0].call('/get-session'), null);
    } finally {
      for (const profileId of profileIds) {
        await db.delete(UserProfiles).where(eq(UserProfiles.id, profileId));
      }
      if (users.length) {
        await db.execute(sql`
          DELETE FROM neon_auth.verification
          WHERE identifier LIKE ${`%${suffix}%`}
        `);
      }
      for (const authUserId of authUserIds) {
        await db.execute(sql`
          DELETE FROM neon_auth."user" WHERE id = ${authUserId}
        `);
      }
      await new Promise(resolve => server.close(resolve));
    }
  }
);
