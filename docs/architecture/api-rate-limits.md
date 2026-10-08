# API rate limits

Bearer signatures are verified before rate-limit attribution. Verified subjects
share a stable user key across token refreshes; anonymous or invalid credentials
use Express's resolved IP (with IPv6 subnet normalization). Protected routes still
reject invalid credentials. General requests retain 300 requests per 15 minutes.

GET /api/v1/stories/me/:storyId/status bypasses only the general budget and has
its own 60 requests/minute budget per user or anonymous IP, across all stories.
Generation mutations retain 30/15 minutes, payments 20/hour, and Pollinations
60/15 minutes, each with an independent store and verified user attribution.
Status polling backs off from 2 to 10 seconds, pauses while hidden, observes
Retry-After on 429, and ends after ten minutes or a terminal status.

## Production proxy verification

The repository establishes a Next.js external rewrite to the API; it cannot
establish how the deployed hosting layers rewrite X-Forwarded-For. Keep the
existing production one-hop default until logs establish the trusted ingress.
TRUST_PROXY accepts a hop count or a comma-separated IP/CIDR allowlist. Never
set it to true. Prefer a verified proxy allowlist when ingress paths differ.

1. Temporarily set RATE_LIMIT_DIAGNOSTICS=true in Render and redeploy this code.
2. Call /users/me as two authenticated accounts through the app. Compare the
   request IDs, ip, ips, forwardedFor, route, policy and key in Render logs.
   Keys must differ even if proxy IPs match. Tokens/cookies are never logged.
3. Compare anonymous requests from different networks through the Next.js
   rewrite and directly to Render. Confirm which layers append or overwrite
   forwarding headers using hosting configuration and these request logs.
4. Configure TRUST_PROXY to trust only verified proxies. A two-hop setting is
   appropriate only if all accepted ingress paths have two trusted hops;
   a publicly reachable direct Render path can make that assumption unsafe.
5. Verify supplied spoofed X-Forwarded-For headers cannot change the resolved
   anonymous IP, then disable RATE_LIMIT_DIAGNOSTICS and expire diagnostic logs.

Production IP attribution remains unverified until these deployed checks run.
Limits use process-local memory; multiple API instances need a shared store
to enforce the same budget across instances.
