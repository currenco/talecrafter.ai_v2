// Only a confirmed terminal failure permits a new generation attempt.
export function retryPolicy(status: string) {
  if (status === "failed" || status === "cancelled") return { allowed: true, newKey: true };
  if (status === "unknown" || status === "not_found") return { allowed: true, newKey: false };
  return { allowed: false, newKey: false };
}
