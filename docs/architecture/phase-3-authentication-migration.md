# Phase 3 Authentication Migration

Status: implemented and verified on `dev/platform-poc`

## Decision

The product now uses Neon Managed Auth through the Next.js same-origin Auth proxy. Clerk has been removed from application code, dependencies, middleware, and tracked environment templates.

The browser obtains a short-lived Neon access token from `/api/auth/token` and sends it to the Express API as a bearer token. Express verifies the token against the branch JWKS and derives identity only from the signed `sub` claim.

Application authorization remains in `app.user_profiles`:

- `auth_user_id` stores the immutable Neon Auth subject.
- `role` stores `user` or `admin` and is checked by Express for every admin request.
- Email is mutable profile/display data and is not accepted as proof of ownership.

## Product Flows

- Email/password signup and sign-in
- Email OTP verification
- Email OTP password reset
- Google OAuth
- Session restoration and sign-out
- Protected Next.js navigation with return-path redirects
- Protected Express routes using verified bearer tokens
- Stable-ID story ownership and admin user mutations

## Configuration

Client runtime:

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `NEXT_PUBLIC_API_BASE_URL`

Server runtime:

- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_JWKS_URL`
- `DATABASE_URL`
- `CORS_ORIGIN`
- `CLIENT_ORIGIN`

The cookie secret is generated locally or in the deployment secret manager and is never committed. Auth URLs and database credentials are branch-scoped.

## Administrator Bootstrap

A user must sign in once so `/api/v1/users/me` creates the application profile. Assign the role using the stable Auth user ID:

```sh
cd server
npm run user:set-role -- <auth-user-id> admin
```

The command does not accept email as an authorization identifier.

## Verification

The live integration test creates temporary users on the isolated development branch and verifies:

- Missing and invalid credentials return `401`.
- Valid JWTs resolve profiles by the signed Auth subject.
- A normal user is denied admin access and an application admin is allowed.
- One user cannot delete another user's story.
- Allowed CORS origins receive the expected header and untrusted origins are denied.
- Verification and reset codes are issued, Google returns an OAuth redirect, and logout clears the browser session.
- Temporary Auth and application records are removed after the test.

Run it with:

```sh
cd server
npm run test:auth
```

Client build, typecheck, lint, server lint/format, environment tests, and the repository diff check must also pass before release.
