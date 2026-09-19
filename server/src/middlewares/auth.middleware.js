import { createRemoteJWKSet, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { UserProfiles } from '../db/schema.js';
import ApiError from '../utils/ApiError.js';

let cachedJwks;
let cachedJwksUrl;

const getAuthConfig = () => {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const jwksUrl = process.env.NEON_AUTH_JWKS_URL;

  if (!baseUrl || !jwksUrl) {
    throw new ApiError(503, 'Neon Auth is not configured');
  }

  return { issuer: new URL(baseUrl).origin, jwksUrl };
};

const getJwks = jwksUrl => {
  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
    cachedJwksUrl = jwksUrl;
  }
  return cachedJwks;
};

export const verifyAccessToken = async token => {
  const { issuer, jwksUrl } = getAuthConfig();
  const { payload } = await jwtVerify(token, getJwks(jwksUrl), {
    issuer,
    audience: issuer,
  });

  if (!payload.sub) throw new ApiError(401, 'Access token has no subject');
  return payload;
};

export const requireAuth = async (req, _res, next) => {
  const authorization = req.get('authorization') ?? '';
  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    return next(new ApiError(401, 'Unauthorized'));
  }

  try {
    const claims = await verifyAccessToken(token);
    req.auth = { userId: String(claims.sub), claims };
    return next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, 'Invalid or expired access token'));
  }
};

export const requireAdmin = async (req, _res, next) => {
  try {
    const [profile] = await db
      .select({ role: UserProfiles.role })
      .from(UserProfiles)
      .where(eq(UserProfiles.authUserId, req.auth.userId))
      .limit(1);

    if (profile?.role !== 'admin') {
      return next(new ApiError(403, 'Forbidden'));
    }

    req.auth.role = profile.role;
    return next();
  } catch (error) {
    return next(error);
  }
};
