const POLLINATIONS_MAX_SEED = 2147483647;

const normalizeSeed = seed => {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    const asInt = Math.floor(Math.abs(seed));
    return asInt % POLLINATIONS_MAX_SEED;
  }

  const raw = String(seed ?? '0');
  const digitsOnly = raw.replace(/\D+/g, '');
  if (!digitsOnly) return 0;

  const reduced = Number(digitsOnly.slice(-9));
  if (!Number.isFinite(reduced)) return 0;

  return Math.floor(Math.abs(reduced)) % POLLINATIONS_MAX_SEED;
};

export const isPollinationsImageUrl = url => {
  if (!url) return false;
  return /^https?:\/\/(gen|image)\.pollinations\.ai\/image\//i.test(url);
};

export const buildPollinationsImageUrl = (prompt, options = {}) => {
  const normalizedPrompt = String(prompt ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 600);

  const safePrompt = encodeURIComponent(
    normalizedPrompt || 'storybook illustration'
  );
  const params = new URLSearchParams({
    model:
      process.env.POLLINATIONS_IMAGE_MODEL ??
      process.env.POLLINATIONS_AI_MODEL ??
      'black-forest-labs/flux.1-schnell',
    enhance: 'false',
    negative_prompt: 'worst quality, blurry',
    safe: 'true',
    seed: String(normalizeSeed(options.seed)),
  });

  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));

  return `https://gen.pollinations.ai/image/${safePrompt}?${params.toString()}`;
};

export const buildPollinationsImageRequest = (
  prompt,
  accessToken,
  options = {}
) => {
  const token = String(accessToken ?? '').trim();
  if (!token.startsWith('sk_')) {
    throw new TypeError('A Pollinations user access token is required');
  }

  return {
    sourceUrl: buildPollinationsImageUrl(prompt, options),
    sourceHeaders: { Authorization: `Bearer ${token}` },
  };
};
