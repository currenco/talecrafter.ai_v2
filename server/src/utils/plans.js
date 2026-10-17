export const CREATOR_PLAN = Object.freeze({
  id: 'creator',
  amount: 900,
  currency: 'USD',
});

export const hasCreatorAccess = (subscription, now = new Date()) =>
  Boolean(
    subscription?.paidThrough &&
    subscription?.periodStart &&
    new Date(subscription.periodStart) <= now &&
    new Date(subscription.paidThrough) > now &&
    !subscription.revoked
  );

export const generationPermission = ({ creator, githubConnected, kind }) => {
  if (creator) return null;
  if (kind.startsWith('interactive')) return 'CREATOR_REQUIRED';
  if (!githubConnected) return 'GITHUB_REQUIRED';
  return null;
};

export const monthlyPeriod = (now = new Date()) =>
  now.toISOString().slice(0, 7);
