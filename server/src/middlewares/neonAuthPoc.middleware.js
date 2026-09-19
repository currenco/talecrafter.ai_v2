import { createRemoteJWKSet, jwtVerify } from 'jose';
import { neon } from '@neondatabase/serverless';
import ApiError from '../utils/ApiError.js';

let cachedJwks;
let cachedJwksUrl;

const getAuthConfig = () => {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const jwksUrl = process.env.NEON_AUTH_JWKS_URL;

  if (!baseUrl || !jwksUrl) {
    throw new ApiError(503, 'Neon Auth proof is not configured');
  }

  const issuer = new URL(baseUrl).origin;
  return { issuer, jwksUrl };
};

const getJwks = jwksUrl => {
  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
    cachedJwksUrl = jwksUrl;
  }

  return cachedJwks;
};

export const verifyNeonAccessToken = async token => {
  const { issuer, jwksUrl } = getAuthConfig();
  const { payload } = await jwtVerify(token, getJwks(jwksUrl), {
    issuer,
    audience: issuer,
  });

  if (!payload.sub) {
    throw new ApiError(401, 'Neon Auth token has no subject');
  }

  return payload;
};

export const requireNeonPocAuth = async (req, _res, next) => {
  const authorization = req.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Unauthorized'));
  }

  try {
    req.neonAuth = await verifyNeonAccessToken(token);
    return next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, 'Invalid or expired Neon Auth token'));
  }
};

export const requireNeonPocAdmin = (req, _res, next) => {
  const sql = neon(process.env.DATABASE_URL);

  return sql`
    select "role"
    from neon_auth."user"
    where "id" = ${req.neonAuth.sub}
    limit 1
  `
    .then(([user]) => {
      if (user?.role !== 'admin') {
        return next(new ApiError(403, 'Forbidden'));
      }

      req.neonAuth.applicationRole = user.role;
      return next();
    })
    .catch(next);
};
