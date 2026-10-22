import ApiError from './ApiError.js';

export const isPollinationsBalanceExhausted = balance =>
  [balance?.balance, balance?.accountBalance?.total].some(
    value => typeof value === 'number' && Number.isFinite(value) && value <= 0
  );

export const imageFundingError = plan =>
  plan === 'creator'
    ? new ApiError(
        503,
        'Image generation is temporarily unavailable. Please try later.',
        [{ code: 'PLATFORM_IMAGE_UNAVAILABLE' }]
      )
    : new ApiError(
        402,
        'Your connected image balance or key budget is used up. Upgrade to Creator for included image generation.',
        [{ code: 'POLLINATIONS_BALANCE_EXHAUSTED' }]
      );
