import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  PollinationsConnections,
  PollinationsOAuthStates,
} from '../db/schema.js';
import ApiError from '../utils/ApiError.js';
import { decryptSecret, encryptSecret } from '../utils/secretBox.js';
import { syncUserFromAuth } from './user.service.js';

const AUTHORIZATION_URL = 'https://enter.pollinations.ai/authorize';
const TOKEN_URL = 'https://enter.pollinations.ai/api/oauth/token';
const USERINFO_URL = 'https://enter.pollinations.ai/api/oauth/userinfo';
const BALANCE_URL = 'https://gen.pollinations.ai/account/balance';
const KEY_URL = 'https://gen.pollinations.ai/account/key';
const STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_EXPIRY_DAYS = 30;
const DEFAULT_BUDGET = 10;

const hashState = state =>
  createHash('sha256').update(String(state)).digest('hex');

const getConfig = () => {
  const appKey = String(
    process.env.POLLINATIONS_APP_KEY ?? process.env.POLLINATIONS_API_KEY ?? ''
  ).trim();
  const clientOrigin = String(process.env.CLIENT_ORIGIN ?? '').replace(
    /\/$/,
    ''
  );
  const imageModel = String(
    process.env.POLLINATIONS_IMAGE_MODEL ??
      process.env.POLLINATIONS_AI_MODEL ??
      'black-forest-labs/flux.1-schnell'
  ).trim();

  if (!appKey.startsWith('pk_')) {
    throw new ApiError(503, 'Pollinations App Key is not configured');
  }
  if (!clientOrigin) {
    throw new ApiError(503, 'Client origin is not configured');
  }

  return {
    appKey,
    imageModel,
    redirectUri: `${clientOrigin}/pollinations/callback`,
  };
};

const parseProviderError = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => null);
  const message = String(
    payload?.error_description ??
      payload?.message ??
      payload?.error ??
      fallbackMessage
  ).slice(0, 300);
  return new ApiError(response.status >= 500 ? 502 : 400, message);
};

const fetchUserInfo = async accessToken => {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
};

const findConnection = async userId => {
  const [connection] = await db
    .select()
    .from(PollinationsConnections)
    .where(eq(PollinationsConnections.userId, userId))
    .limit(1);
  return connection ?? null;
};

const connectionState = connection => {
  if (!connection || connection.revokedAt) return 'disconnected';
  if (connection.expiresAt.getTime() <= Date.now()) return 'expired';
  return 'connected';
};

const inspectAccessToken = async accessToken => {
  const response = await fetch(KEY_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (response.status === 401) {
    throw new ApiError(401, 'Reconnect your Pollinations wallet');
  }
  if (!response.ok) {
    throw new ApiError(502, 'Unable to verify the Pollinations wallet');
  }
  return response.json();
};

const hasConfiguredModel = keyDetails => {
  const allowedModels = Array.isArray(keyDetails?.permissions?.models)
    ? keyDetails.permissions.models.map(String)
    : [];
  return allowedModels.includes(getConfig().imageModel);
};

export const beginPollinationsConnection = async ({ userId }) => {
  const user = await syncUserFromAuth(userId);
  const config = getConfig();
  const state = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(48).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);

  await db.batch([
    db
      .delete(PollinationsOAuthStates)
      .where(eq(PollinationsOAuthStates.userId, user.id)),
    db.insert(PollinationsOAuthStates).values({
      stateHash: hashState(state),
      userId: user.id,
      encryptedCodeVerifier: encryptSecret(codeVerifier),
      redirectUri: config.redirectUri,
      expiresAt,
    }),
  ]);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.appKey,
    redirect_uri: config.redirectUri,
    scope: 'usage',
    models: config.imageModel,
    budget: String(DEFAULT_BUDGET),
    expiry: String(DEFAULT_EXPIRY_DAYS),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return { authorizationUrl: `${AUTHORIZATION_URL}?${params.toString()}` };
};

export const completePollinationsConnection = async ({
  userId,
  code,
  state,
}) => {
  const user = await syncUserFromAuth(userId);
  const safeCode = String(code ?? '').trim();
  const safeState = String(state ?? '').trim();
  if (!safeCode || !safeState) {
    throw new ApiError(
      400,
      'Pollinations authorization code and state are required'
    );
  }

  const stateHash = hashState(safeState);
  const [oauthState] = await db
    .delete(PollinationsOAuthStates)
    .where(
      and(
        eq(PollinationsOAuthStates.stateHash, stateHash),
        eq(PollinationsOAuthStates.userId, user.id)
      )
    )
    .returning();

  if (!oauthState || oauthState.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(
      400,
      'Pollinations authorization has expired or is invalid'
    );
  }

  const config = getConfig();
  if (oauthState.redirectUri !== config.redirectUri) {
    throw new ApiError(400, 'Pollinations redirect URI does not match');
  }

  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: safeCode,
      client_id: config.appKey,
      redirect_uri: config.redirectUri,
      code_verifier: decryptSecret(oauthState.encryptedCodeVerifier),
    }),
    cache: 'no-store',
  });
  if (!tokenResponse.ok) {
    throw await parseProviderError(
      tokenResponse,
      'Pollinations authorization failed'
    );
  }

  const token = await tokenResponse.json();
  const accessToken = String(token?.access_token ?? '').trim();
  const expiresIn = Number(token?.expires_in ?? 0);
  if (!accessToken.startsWith('sk_') || !Number.isFinite(expiresIn)) {
    throw new ApiError(502, 'Pollinations returned an invalid access token');
  }

  const providerUser = await fetchUserInfo(accessToken);
  const now = new Date();
  const expiresAt = new Date(Date.now() + Math.max(1, expiresIn) * 1000);
  await db
    .insert(PollinationsConnections)
    .values({
      userId: user.id,
      providerUserId: providerUser?.sub ? String(providerUser.sub) : null,
      providerUsername: providerUser?.preferred_username
        ? String(providerUser.preferred_username)
        : null,
      encryptedAccessToken: encryptSecret(accessToken),
      scope: String(token?.scope ?? ''),
      expiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: PollinationsConnections.userId,
      set: {
        providerUserId: providerUser?.sub ? String(providerUser.sub) : null,
        providerUsername: providerUser?.preferred_username
          ? String(providerUser.preferred_username)
          : null,
        encryptedAccessToken: encryptSecret(accessToken),
        scope: String(token?.scope ?? ''),
        expiresAt,
        revokedAt: null,
        updatedAt: now,
      },
    });

  return getPollinationsConnectionStatus({ userId });
};

export const getPollinationsAccessTokenForProfile = async profileId => {
  const connection = await findConnection(profileId);
  const state = connectionState(connection);
  if (state !== 'connected') {
    throw new ApiError(
      428,
      state === 'expired'
        ? 'Reconnect your Pollinations wallet to generate images'
        : 'Connect your Pollinations wallet to generate images'
    );
  }
  const accessToken = decryptSecret(connection.encryptedAccessToken);
  const keyDetails = await inspectAccessToken(accessToken);
  if (!hasConfiguredModel(keyDetails)) {
    throw new ApiError(
      428,
      'Reconnect your Pollinations wallet to authorize the current image model'
    );
  }
  return accessToken;
};

export const getPollinationsConnectionStatus = async ({ userId }) => {
  const user = await syncUserFromAuth(userId);
  const connection = await findConnection(user.id);
  const state = connectionState(connection);
  const result = {
    state,
    connected: state === 'connected',
    username: connection?.providerUsername ?? null,
    expiresAt: connection?.expiresAt ?? null,
    balance: null,
  };

  if (state !== 'connected') return result;

  const accessToken = decryptSecret(connection.encryptedAccessToken);
  let keyDetails;
  try {
    keyDetails = await inspectAccessToken(accessToken);
  } catch (error) {
    if (error?.statusCode !== 401) return result;
    await db
      .update(PollinationsConnections)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(PollinationsConnections.id, connection.id));
    return { ...result, state: 'revoked', connected: false };
  }
  if (!hasConfiguredModel(keyDetails)) {
    return { ...result, state: 'model_not_authorized', connected: false };
  }

  const response = await fetch(BALANCE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  if (response.ok) {
    result.balance = await response.json().catch(() => null);
  }

  return result;
};

export const disconnectPollinations = async ({ userId }) => {
  const user = await syncUserFromAuth(userId);
  await db
    .update(PollinationsConnections)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(PollinationsConnections.userId, user.id));
  return { state: 'disconnected', connected: false };
};
