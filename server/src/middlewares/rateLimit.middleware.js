import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { logger } from '../utils/logger.js';

export const rateLimitKey = req =>
  req.auth?.userId
    ? `user:${req.auth.userId}`
    : `ip:${ipKeyGenerator(req.ip ?? req.socket.remoteAddress)}`;

export const isGenerationStatusRequest = req =>
  req.method === 'GET' && /^\/stories\/me\/[^/]+\/status\/?$/i.test(req.path);

const logAttribution = (req, policy, key) => {
  if (process.env.RATE_LIMIT_DIAGNOSTICS === 'true') {
    logger.info('API rate-limit attribution', {
      requestId: req.requestId,
      policy,
      ip: req.ip,
      ips: req.ips,
      forwardedFor: String(req.get('x-forwarded-for') ?? '').slice(0, 1024),
      route: req.originalUrl.split('?')[0],
      key,
    });
  }
};

const diagnosticKey = policy => req => {
  const key = rateLimitKey(req);
  logAttribution(req, policy, key);
  return key;
};

const common = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
    errors: [],
  },
};

export const apiRateLimit = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  keyGenerator: diagnosticKey('general'),
  skip: req =>
    req.path.startsWith('/pollinations') || isGenerationStatusRequest(req),
});

export const generationStatusRateLimit = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: diagnosticKey('generation-status'),
});

export const pollinationsRateLimit = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: diagnosticKey('pollinations'),
});

export const generationRateLimit = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: diagnosticKey('generation'),
});

export const paymentRateLimit = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: diagnosticKey('payments'),
});
