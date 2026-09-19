# Client Application

This directory contains the Next.js frontend for the product migration workspace.

The frontend is responsible for rendering the product experience, managing browser auth state, and calling the Express API. Database access, authorization decisions, AI provider calls, persistent image storage, credit mutation, payments, and admin mutations belong to the backend.

The current Clerk integration is temporary and will be replaced during the authentication phase in the root [migration roadmap](../MIGRATION_ROADMAP.md). Do not add new Clerk-specific behavior unless it is required to keep the baseline working before that phase.

## Development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The development server defaults to `http://localhost:3000` and expects the Express API at the URL configured by `NEXT_PUBLIC_API_BASE_URL`.

## Verification

```sh
npm run typecheck
npm run lint
npm run build -- --webpack
```

See the root [README](../README.md) for repository-wide setup and migration rules.
