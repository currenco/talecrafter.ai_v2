# New Product Migration Workspace

This repository contains the existing TaleCrafter application while it is progressively rebuilt as a new product. All migration work happens in place; there is no parallel rewrite or second repository.

The canonical implementation sequence, decision gates, and completion criteria are documented in [MIGRATION_ROADMAP.md](./MIGRATION_ROADMAP.md).

## Repository Structure

- `client/` - Next.js frontend and browser-facing product experience.
- `server/` - Express API for application data, authorization, AI workflows, storage operations, payments, and administration.
- `docs/` - Focused technical and operational notes.

## Current Baseline

The following capabilities are intentionally retained while the infrastructure is migrated:

- Classic illustrated story generation
- Interactive branching stories
- Public story exploration and slug-based reading
- User dashboard and story management
- Credit accounting and Stripe Checkout
- PDF export and browser narration
- Administrative management

Feedback collection is not part of the retained baseline and will be reconsidered with the new product experience.

The infrastructure foundation now uses Neon PostgreSQL, Neon Managed Auth, and Cloudinary media storage behind a backend-owned adapter. Application ownership uses stable Auth user IDs, while storage records retain provider and object-key identity independently from delivery URLs.

## Local Development

Install and run the applications independently:

```sh
cd server
npm ci
cp .env.example .env
npm run migrate
npm run dev
```

```sh
cd client
npm ci
cp .env.example .env.local
npm run dev
```

The client defaults to `http://localhost:3000`. The API defaults to `http://localhost:8000`, with health endpoints at `/api/v1/health` and `/api/v1/health/ready`.

Never commit real credentials. Tracked environment files contain names and safe examples only.

For deployment, configure each service from its own tracked template:

- `server/.env.example` lists API runtime variables first and local-only database tooling variables last.
- `client/.env.example` separates browser-safe configuration from private Neon Auth configuration.
- The repository root does not own application environment variables; the server and client load their own env files.

## Verification

Run these checks before completing a migration phase:

```sh
cd server
npm run build
```

```sh
cd client
npm run typecheck
npm run lint
npm run build -- --webpack
```

Database and payment integration tests require an explicitly configured test environment and should be run for phases that affect those systems.

## Migration Rules

- Keep the project runnable after every phase.
- Do not introduce new infrastructure before its roadmap proof of concept passes.
- Keep database migrations and provider adapters in this repository.
- Use stable authenticated user IDs for ownership in the new schema; email must not be an authorization key.
- Treat legacy-data import as optional work after the new product is stable.
