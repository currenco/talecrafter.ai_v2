// Only configure additional hops after checking every ingress path, including
// direct Render traffic. Blindly trusting all forwarded headers permits spoofing.
export const getTrustProxy = (source = process.env) => {
  const value = source.TRUST_PROXY?.trim();
  if (!value) return source.NODE_ENV === 'production' ? 1 : false;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true' || value === 'false') {
    throw new Error(
      'TRUST_PROXY must be a hop count or trusted proxy IP/CIDR list'
    );
  }
  return value
    .split(',')
    .map(address => address.trim())
    .filter(Boolean);
};
