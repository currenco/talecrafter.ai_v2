# Build Configuration Security

On 2026-10-13, static inspection of the rewritten remote branches found an
encoded remote-code downloader appended to `client/postcss.config.mjs`.
The remote feature branch also included an automatic VS Code task running
JavaScript disguised as `public/fonts/fa-solid-700.otf`. Neither was checked
out or executed during this cleanup. The source of the remote rewrite and
whether those files previously executed on another system are not established.

The cleaned feature branch retains the reviewed local application tree while
recording the remote commit as merged. Its tree excludes the injected loader,
automatic editor configuration and unrelated root font bundle. History is not
rewritten, so old affected commits remain unsafe to check out and run.

`npm run dev` and `npm run build` in `client/` run a static preflight before
Next.js can load PostCSS. It pins the reviewed configuration digest and rejects
the known disguised executable and automatic editor tasks. Intentional PostCSS
changes need source review before updating the digest. This is a focused
regression guard, not a malware scanner or protection against an attacker who
can also modify the guard. Direct `next` commands bypass npm lifecycle checks.

Before deployment:

- Merge only the cleaned feature-branch tip, not an old affected commit.
- Verify GitHub access, recent pushes, deploy keys, integrations and branch
  protections; resolve unauthorized access before relying on another push.
- If an affected checkout was opened with automatic tasks enabled, or its
  config was loaded by a build/dev process, treat accessible credentials as
  potentially exposed. Stop affected jobs and investigate from a trusted system.
- Rotate affected provider, database, deployment and repository credentials
  through their respective consoles. Coordinate encryption-key rotation with
  existing encrypted Pollinations tokens; blindly replacing that key makes
  existing tokens unreadable and requires reconnection or re-encryption.
- Inspect CI/deployment logs and rebuild the verified commit in a clean
  environment. This repository cleanup does not establish that a previously
  affected laptop, build worker or deployment is clean.
