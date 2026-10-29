# TaleCrafter AI — Repository Analysis and Interview Reference

Analysis date: 15 October 2026. This document describes the checked-out implementation, not a verified production deployment. The existing root and client READMEs are preserved.

Evidence comes from the application routes, components, services, middleware, database schema and SQL migrations, configuration, scripts, and tests. **Implemented** means present in executable application code; **historical** means retained schema or documentation outside the active flow; **recommendation** means proposed work. Provider availability, production settings, and business results were not inferred from source code.

## 1. Project Overview

TaleCrafter AI is a full-stack **web application** for generating and reading illustrated stories. A user supplies a premise, genre, and visual style; Gemini generates structured narrative content, Pollinations generates illustrations, and Cloudinary stores the resulting images. Users can also derive a premise from an uploaded image, continue an interactive story through choices, browse published books, and export a book as a PDF with Creator access.

The product addresses the workflow of turning an idea into a short illustrated book without manually writing each page and producing each illustration. The interface targets readers and people creating illustrated stories; specific customer demographics, adoption, revenue, and business impact are not established by the repository.

The repository is undergoing an in-place product migration. Its current runtime is Next.js + Express + PostgreSQL on Neon + Neon Managed Auth. It is **not a React Native application**: there are no application iOS/Android projects, Expo configuration, native navigation stack, or native modules. Mobile support here means responsive browser UI.

Current access rules, from `server/src/utils/plans.js`, `server/src/services/entitlement.service.js`:

| Capability | Free | Creator |
| --- | --- | --- |
| Read published stories | Public; sign-in not required | Same public library |
| Create classic stories | Requires linked GitHub account | Does not require GitHub linkage |
| Image credentials | Connected, funded user Pollinations account | Server-owned platform key |
| Interactive creation/continuation/completion | Denied | Allowed while entitlement is valid |
| Projects | No monthly per-user quota | No monthly per-user quota |
| Generated images | User provider balance and restrictions | Shared platform budget and provider restrictions |
| Character/scene pack and PDF action | Creator upsell | Available |
| Configured subscription price | No subscription | USD 9 monthly (`900` minor units) |

These are repository-configured rules, not confirmation that paid checkout is live. `CREATOR_CHECKOUT_ENABLED` defaults to false. A classic story normally needs five page images plus a cover. Per-user usage reservations are no longer created or consulted, including on resume. Creator image requests still consume the shared platform attempt budget, even if the provider request fails. Neither plan should be marketed as unlimited generation.

## 2. Technology Stack

Versions below are manifest declarations; lockfiles provide resolved installations. They are not claims about the latest available releases.

| Technology | Declared version / location | Actual use |
| --- | --- | --- |
| TypeScript, TSX | `client/tsconfig.json`, TypeScript `^5` | Client components, page contracts, API response types; strict checking enabled |
| JavaScript ES modules | `server/package.json`, `type: module` | Express API, services, tools, Node tests |
| Next.js | `^16.3.5` | App Router, server-rendered story entry, route handlers, proxy protection, rewrites |
| React / React DOM | `18.3.1` | Components, context, state, effects, refs, memoized derivations |
| Tailwind CSS / PostCSS | `^3.4.1` / `^8` | Utility styles, theme tokens, NextUI plugin; global CSS and a home CSS module |
| NextUI | React `^2.4.8`, modal `^2.0.41` | Buttons, cards, modal loading and account UI, provider |
| Framer Motion | `^11.11.10` | Hero, navbar, entrance/exit effects, scroll animation, reduced-motion handling in several components |
| Icon libraries | Lucide, Tabler, React Icons | UI icons; multiple libraries are actually imported |
| `react-toastify` | `^10.0.6` | Shared toast feedback |
| `react-pageflip` | `^2.0.3` | Browser flipbook, dynamically imported without SSR |
| `html2canvas`, `jspdf` | `^1.4.1`, `^4.2.1` | On-demand browser PDF rendering from story DOM |
| `@neondatabase/auth` | `^0.5.0-beta` | Browser session APIs and Next.js server auth proxy |
| Express | `^5.2.1` | REST API under `/api/v1` |
| Zod | `^4.6.5` | Server environment and request validation |
| Drizzle ORM / Kit | `^0.45.2` / `^0.31.10` | PostgreSQL schema/query layer and migration generation |
| Neon serverless driver | `^1.1.0` | HTTP database access and migration transactions |
| `jose` | `^6.2.12` | JWT verification against remote JWKS |
| Google Generative AI SDK | `^0.24.1` | Gemini text and structured story generation |
| Pollinations HTTP API | Native `fetch` | OAuth connection, account inspection, generated image requests |
| Cloudinary | `^2.11.0` | Signing uploads, delivery URL generation, object deletion |
| Razorpay | `^2.9.8` | Subscription, invoice, payment, and cancellation API calls |
| Helmet, CORS, cookie-parser, dotenv | Server manifest | Security headers, origin policy, cookie parsing, environment loading |
| Node test runner, PGlite | PGlite `^0.5.8` | Unit tests and isolated PostgreSQL integration tests |
| ESLint / Prettier | ESLint 9, server Prettier 3 | Static checks; server formatting checks |

`clsx` and `tailwind-merge` implement `client/lib/utils.ts`'s `cn` class helper. `shadcn` and `client/components.json` support UI scaffolding configuration; their presence does not imply a separate application framework. Browser APIs include FileReader, canvas, speech synthesis, Web Share, clipboard, sessionStorage, IntersectionObserver, ResizeObserver, and requestAnimationFrame. There is no Redux/Zustand store, React Query layer, or browser database client in the active app.

## 3. Architecture and Folder Structure

```text
Browser
  ├─ Next.js pages and client components
  ├─ /api/auth/* → Neon Managed Auth through Next.js handlers
  └─ /api/v1/* → Next.js rewrite → Express
                                  ├─ JWT identity / app roles / validation
                                  ├─ domain services → Drizzle → Neon PostgreSQL
                                  ├─ Gemini narrative generation
                                  ├─ Pollinations OAuth and image generation
                                  ├─ ObjectStorage adapter → Cloudinary
                                  └─ Razorpay subscriptions and signed webhooks
```

Public server components also call Express directly using private `API_BASE_URL`. Domain authorization belongs to Express; route protection and button visibility in Next.js are user-experience controls.

```text
client/
  app/
    layout.tsx, Provider.tsx       Global shell and session/profile context
    (components)/                Header, Footer, Hero, media and loading UI
    (auth)/                      Sign-in, sign-up, email verification/reset
    api/auth/[...path]/route.ts   Auth SDK route delegation
    auth/{google,github}/        Social sign-in entry routes
    create-story/                Form and image-to-premise workflow
    dashboard/                   Unified draft/published library
    explore/                     Public infinite-scroll library
    story/[slug]/                Canonical server/client reader
    view-story/[id]/              Legacy URL redirect
    interactive-story/[id]/      Choice-based draft reader
    pricing/, admin/, about/      Plans, administration, product content
    pollinations/callback/       OAuth return UI
  components/                    Checkout, story pack, GitHub linking, UI primitives
  lib/                           Auth, API client, story fetching/polling/text/images
  types/story.ts                 Shared frontend story contracts
  public/                        Images, videos, 240 sequence-frame JPEGs
  test/                          Build-safety, polling, text utility tests
  proxy.ts, next.config.ts        Protected routes, API rewrite, asset configuration
server/
  src/index.js, app.js            Startup/shutdown and middleware/router assembly
  src/routes/, controllers/       HTTP routing and request/response adapters
  src/validations/, middlewares/  Zod, identity, roles, errors, request IDs
  src/services/                  Story, AI, jobs, entitlements, assets, billing, admin
  src/storage/                   ObjectStorage contract and Cloudinary implementation
  src/db/                        Drizzle schema, HTTP driver, SQL migration history
  src/utils/, config/            Plans, signatures, encryption, pagination, environment
  scripts/                       Migration, seed, role assignment, legacy report
  test/                          Unit, isolated integration, opt-in live integration tests
docs/architecture/               Migration decisions and operational notes
MIGRATION_ROADMAP.md              Remaining work and historical context
neon.ts, hello.ts                 Neon preview function proof/configuration
```

`server/src/index.js` loads dotenv, validates environment, dynamically imports the app, starts the HTTP listener, and closes it on SIGTERM/SIGINT. `app.js` orders request IDs, Helmet, CORS, raw payment webhook parsing, normal JSON/form parsing, cookies, identity attachment, routers, and final error handling. The raw webhook route is deliberately mounted before JSON parsing.

Root `neon.ts` enables Auth and declares a preview `api` function pointing to `hello.ts`, which returns a greeting. It does not deploy the Express application; AI Gateway is commented out. No root package/workspace script, tracked CI workflow, Docker configuration, or hosting deployment manifest was found. Existing operational notes discuss hosting, but actual deployed state was not inspected.

## 4. Features and Modules

| Module | Verified behavior | Main implementation |
| --- | --- | --- |
| Landing/about | Animated product presentation, FAQs, examples, links, shared pricing | `client/app/(components)/Hero.tsx`, `client/app/about/page.tsx` |
| Responsive navigation | Desktop/mobile navigation, account modal, logout, role-sensitive links | `client/app/(components)/Header.tsx`, `client/components/ui/resizable-navbar.tsx` |
| Account access | Email/password, verification OTP, reset OTP, Google/GitHub sign-in, GitHub linking | `client/app/(auth)/`, `client/app/auth/`, `client/components/ConnectGithub.tsx` |
| Story form | Premise, genre and illustration style; fixed `All Ages` request value | `client/app/create-story/page.tsx`, its `(component)/` children |
| Classic generation | Five-page text draft, persisted cover/page images, publication, progress, resume | `server/src/services/story.service.js`, `client/lib/story-generation.ts` |
| Interactive stories | Five-page starter, two choices, 2–3-page continuations, depth limit 7, ending compilation | `server/src/services/interactiveStory.service.js`, `plottwist.service.js`, `client/app/interactive-story/[id]/page.tsx` |
| Library | Draft and published collections, infinite scrolling, delete, resume/continue | `client/app/dashboard/_components/` |
| Explore | Public published books, session cache and scroll restoration | `client/app/explore/page.tsx` |
| Reader | Flipbook and continuous story modes, narration, share, related books, image fallbacks | `client/app/story/[slug]/StoryPageClient.tsx`, `client/app/view-story/_components/` |
| Creator exports | Character bible and scene prompts from authenticated API; PDF assembled in browser | `client/components/CreatorStoryPack.tsx`, reader, `server/src/controllers/story.controller.js` |
| Subscription management | Availability gate, checkout consent, verify, refresh, cancellation, webhook reconciliation | `client/components/CreatorCheckout.tsx`, `server/src/services/payment.service.js` |
| Pollinations connection | PKCE, single-use state, encrypted token persistence, expiry/permission checks | `server/src/services/pollinations.service.js`, callback page |
| Administration | Paginated story/user lists, counts, local search/filter, deletion restrictions | `client/app/admin/page.tsx`, `server/src/services/admin.service.js` |

Important scope boundaries:

- Interactive UI records one chosen path and shows its history; it is not a general editor for revisiting arbitrary branches. Selecting a choice locks that node.
- Story versions exist in the schema, but current generation updates version 1; no user-facing version history/editor was found.
- Video files are marketing assets. Story-to-video generation is roadmap work, not an implemented pipeline.
- `backfillStorySlugs` is a no-op returning zero counts despite having an admin route.
- Credit accounts, credit ledger, old payments/events, and legacy users remain historical data structures. Active subscription services do not grant/spend legacy credit balances. Earlier phase documents and `docs/payments-future.md` describe obsolete credit flows.

## 5. Application Flow

| URL | Entry and transition |
| --- | --- |
| `/` | `app/page.tsx` renders Hero; links to explore/create and pricing content |
| `/about`, `/pricing` | Public product/plan views; checkout loads availability or signed-in status |
| `/explore` | Loads public stories; cards lead to slug reader or legacy ID route |
| `/story/[slug]` | Server fetch → `notFound()` on missing story → interactive client reader |
| `/view-story/[id]` | Server resolves published story → permanent redirect to canonical slug; missing slug is 404 |
| `/sign-in` | Email success returns to validated local `redirect` path or dashboard |
| `/sign-up` → `/verify-email` | Create account → send OTP → verification → dashboard |
| `/forgot-password` | Send reset OTP → submit OTP/new password → sign-in |
| `/auth/google`, `/auth/github` | Start provider login; callbacks target dashboard |
| `/dashboard` | Load drafts/published stories independently; resume classic or continue interactive draft |
| `/create-story` | Check access/wallet, submit form; classic polls then opens slug; interactive opens its draft |
| `/interactive-story/[id]` | Load owner-only state → choose/continue or end → completed slug reader |
| `/pollinations/callback` | Read code/state → authenticated backend exchange → return to create-story |
| `/admin` | API requires administrator role; UI offers stories/users tabs |
| `/users`, `/buy-credits` | Redirect to `/admin` and `/pricing`, respectively |

`client/proxy.ts` protects `/admin`, `/buy-credits`, `/create-story`, `/dashboard`, and `/interactive-story` prefixes with Neon Auth middleware. It also handles requests containing the Neon session-verifier query parameter. The API independently checks bearer tokens, roles, and ownership. Social sign-in and sign-up do not preserve the email sign-in page's full redirect behavior.

## 6. Technical Implementation

### Components, hooks, and communication

`Provider` wraps the app with `UserDetailContext`, NextUIProvider, and ToastContainer. Auth state comes from `authClient.useSession()` through `useUser`; application profile state comes from `/users/me`. Profile data includes role, plan, linked GitHub status, permissions, paid-through date, and cancellation state.

The provider has a per-auth-user five-minute in-memory profile cache and a map of pending profile requests. It checks token availability every minute and on online/visible events. That periodic check does not itself refresh plan data every minute. `setUserDetail` updates both context and the profile cache.

Forms and page state use `useState`. Story selector children report `{fieldName, fieldValue}` to the parent's functional state update. `useRef` stores flipbook handles, pending flags, DOM observers, and mutation idempotency keys without triggering rerenders. `useMemo` derives interactive node maps/ancestor paths and local admin filters. `useCallback` stabilizes fetching functions used in effects. Several effects use an ignore flag or captured user ID to reject stale async results.

Explore caches loaded stories, offset, end-of-list state, and scroll position in sessionStorage without a TTL. The current dashboard fetches fresh collections and does not restore the old dashboard cache, although cache invalidation code for that historical key remains. Neither cache is an authorization boundary.

### Authentication and authorization

1. `client/lib/neon-auth/server.ts` lazily constructs the auth server SDK with private auth URL and cookie secret.
2. `/api/auth/[...path]` delegates GET/POST/PUT/DELETE/PATCH to the SDK; managed authentication internals are external to this repository.
3. `client/lib/neon-auth/client.ts` caches short-lived access tokens, uses JWT `exp` only for cache timing, refreshes with a 30-second safety window, coalesces concurrent requests, and retries missing/error token responses after 150/350 ms.
4. Token failure triggers an authoritative session check. Confirmed expiry clears local token state, signs out, and redirects to sign-in; an uncertain provider failure is not automatically treated as logout.
5. Express uses `jose.jwtVerify` with remote JWKS and issuer/audience equal to the auth base URL's origin. `sub` becomes `req.auth.userId`.
6. `syncUserFromAuth` reads `neon_auth."user"`, normalizes profile details, and upserts on stable `auth_user_id`. Email is display/profile data, not an ownership key.
7. `requireAdmin` reads the application profile's role from PostgreSQL. Owned story mutations resolve the internal profile and constrain queries by owner ID.

GitHub-linked access is verified from `neon_auth.account`, not from a browser-supplied boolean. Auth provider credentials, email delivery, account-linking policy, and hosted OTP policy are not implemented locally and were not verified live.

### Persistence and data model

`server/src/db/index.js` uses `drizzle-orm/neon-http`. The application schema is `app`; managed authentication tables live in `neon_auth`. Many domain writes use `db.batch`; migrations use the driver's transaction API. Quota reservation/release uses PostgreSQL functions with row locks.

| Table group | Responsibility and important constraints |
| --- | --- |
| `user_profiles` | Internal UUID; unique stable auth ID; role check; email indexed but not unique identity |
| `stories` | Internal UUID, separate unique public UUID exposed as `storyId`, unique slug; classic/interactive kind and draft/published/archived state |
| `story_versions` | JSONB narrative and provider metadata; unique story/version pair |
| `interactive_stories` | Root/current node IDs, page count, optional compiled pages |
| `interactive_story_nodes` | Parent linkage, depth, choice fields, JSONB pages; partial unique index allows one active node per story |
| `assets` | Owner/story relation, provider/container/object key, access/MIME/bytes/status; unique storage identity |
| `generation_jobs` | Unique owner/idempotency key, request hash, provider/model, status/result/errors/timing |
| `pollinations_connections`, `pollinations_oauth_states` | Encrypted token/verifier, expiry/revocation, hashed single-use state |
| `creator_subscriptions`, `subscription_invoices`, `subscription_holds` | One subscription record per profile; unique provider subscription/payment/invoice identifiers; paid periods and refund/dispute holds |
| `plan_usage_buckets`, `plan_usage_reservations` | Shared platform budget counters; historical user reservations are unused |
| Historical tables | `credit_accounts`, `credit_ledger`, `payments`, `payment_events`, `legacy_users` |
| `seed_records` | Repeatable development seed bookkeeping |

Foreign keys cascade story-owned records and restrict deletion where financial history exists. Auth-user deletion is not wired to profile deletion through a schema foreign key. `InteractiveStories` root/current IDs are UUID columns without node foreign keys; node parent IDs do have a self-reference. Main indexes cover owners, public status, genre, job ownership, and storage identity.

Migrations `0000`–`0009` preserve evolution: initial schema; interactive parent/active-node constraints; generation metadata; historical Stripe product data; Pollinations credentials; removal of Stripe product table/defaults; legacy user archive; subscription/usage tables and functions; subscription holds. SQL migrations contain functions that are not expressible merely by reading the Drizzle table definitions.

## 7. End-to-End Feature Workflows

### Classic illustrated book

1. `GenerateStory` validates subject/type/style and current UI permissions, then constructs `{storySubject, storyType, ageGroup: "All Ages", imageStyle}`. It retains a UUID idempotency key for uncertain failures or HTTP 425.
2. `POST /stories` validates input, authenticates, and calls `createClassicStory`. The service syncs the user and looks for a matching unfinished classic draft by its four form values. An already-running matching draft is returned directly.
3. `reserveGenerationForProfile` hashes canonicalized `{kind, request, storyId}`, inserts a unique running job, and reserves monthly project usage. Replays return a stored successful result, reject mismatched input with 409, or report running work with 425.
4. The server resolves eligible image credentials. If no resumable draft exists, Gemini produces JSON. `generateStoryJson` parses/normalizes it and makes one repair request if necessary. Normalization requires a title, nonempty character descriptions, and five complete chapters; extra chapters are sliced to five.
5. The story draft, version-1 content, and job association are saved. `startClassicStoryImageGeneration` launches an unawaited in-process promise. The HTTP response is 202 **after text generation and draft persistence**, not immediately on receipt of the request.
6. The background operation creates cover then chapter images sequentially. Each generated image resolves server-side credentials, reserves user image usage (plus a nonrefundable platform attempt for Creator), fetches Pollinations, uploads to Cloudinary, and saves asset metadata and story progress.
7. Missing images are skipped on a later resume. Publication and successful job completion are persisted together after all images finish. Failure records a failed job and releases its project reservation while retaining already saved images/content.
8. `waitForStoryPublication` polls owner status starting at 2 seconds, multiplies delay by 1.5 up to 10 seconds, pauses while hidden, honors numeric Retry-After on 429, and has a ten-minute deadline. Publication navigates to `/story/[slug]`; failure/timeout surfaces a toast and leaves the draft available in the dashboard.

### Interactive story and ending

1. The same form submits to `/interactive-stories`; the backend requires Creator access, creates a job, and generates five starter pages plus a cover.
2. Image batches default to three concurrent workers. Generated choices are parsed; failure of the starter-choice request uses two fixed fallback choices. All starter data and asset records are saved with a root node.
3. The interactive page loads owner-only `{story,nodes}`, derives the active node and its ancestor chain, and renders the linear pages plus choice history.
4. Choosing a path POSTs a choice with an idempotency key. The backend checks ownership, completion, selected-choice lock, and maximum depth; prompts Gemini using the latest six pages plus stored character descriptions; parses 2–3 pages and two choices; persists images.
5. A database batch deactivates the prior node, saves its selected choice, inserts a new active node, updates the story pointer/count, and completes the job. The partial unique index prevents two active nodes from being committed, but provider calls occur before that conflict can be detected.
6. Explicit completion, or the UI's depth-limit ending action, generates a 2–3-page resolution, compiles the chosen ancestor path, rewrites version 1 into the classic chapter format, publishes the story, and returns `completedSlug`. The client replaces the draft URL with the public reader.

Interactive generation is awaited within each HTTP request; it does not share the classic background polling/resume mechanism. Completion uses the first compiled page image as the published cover when available, even though a separate starter cover was generated.

### Pollinations OAuth connection

`POST /pollinations/connect` creates random state and a PKCE verifier, stores a state hash and encrypted verifier with a ten-minute expiry, and returns an authorization URL. The callback page POSTs code/state with the signed-in user's bearer token. The backend atomically consumes matching user-bound state, checks expiry and redirect URI, exchanges code/verifier, and encrypts the returned token. It checks model permission and may fetch account balance. Free generation requires an active, authorized connection; Creator instead uses the platform key. Disconnect marks the local connection revoked; no provider-side revocation request is implemented.

### Subscription purchase and renewal

`CreatorCheckout` loads availability/status, requires a consent checkbox, and lazily loads Razorpay Standard Checkout. The backend verifies the configured plan is monthly USD 9 and claims a `creating` record before making a provider request, preventing ordinary concurrent clicks from creating multiple mandates. An ambiguous failure leaves the claim locked for reconciliation.

Checkout returns payment/subscription/signature fields. The server checks ownership and HMAC, fetches the payment and invoice, and grants access only for a captured, unrefunded, exact-price paid invoice tied to that subscription and a valid billing period. Authorization of a mandate alone does not grant Creator access.

Signed raw-body webhooks reconcile renewals and current provider status. Invoice uniqueness and transaction advisory locks protect replay and refund ordering. Refund/dispute events create holds even when they arrive before the invoice. Cancellation stops renewal while preserving an already-paid period; `hasCreatorAccess` derives access from period dates and revocation, rather than trusting the provider's status string alone.

### Reading, export, and deletion

The server-rendered slug page fetches published data with a 60-second revalidation interval. The browser dynamically loads flipbook code, displays persisted images with fallbacks, and coordinates narration through parent callbacks. Sharing uses Web Share or clipboard.

PDF export checks context permission and calls the protected Creator pack endpoint before importing export libraries. It clones an off-screen export DOM tree, converts remote images to data URLs with retries, renders each section via html2canvas, and adds JPEG pages to an A4 jsPDF document. Cleanup runs in `finally`. This is client-generated raster PDF output, not a server-rendered or text-searchable export service.

Story deletion verifies ownership (or admin role), deletes provider objects first, marks asset records deleted, then deletes the story and cascading records. Admin profile deletion refuses users with payment/subscription history. It removes an application profile, not the managed-auth account; later sign-in can recreate the profile.

## 8. API Integration

### Shared contract

All Express paths below are relative to `/api/v1`. Browser calls use `client/lib/api-client.ts`; Next rewrites forward them to the backend. Protected routes require `Authorization: Bearer <access-token>`. Generation mutations require `Idempotency-Key` matching 8–255 characters from letters, numbers, `.`, `_`, `:`, and `-`. Some early-return paths (already running/published) bypass job reservation.

Success envelope:

```json
{ "statusCode": 200, "data": {}, "message": "Success", "success": true }
```

Failure envelope contains `success: false`, `statusCode`, `message`, `errors`, and `requestId`. Zod issues use path/message entries; selected auth/access failures use codes. `apiFetch<T>` returns only `data`, throws `ApiClientError` on failure, coalesces in-flight GETs by path/token, and retries recognized access-token failures once after refresh. It does not retry every 401: Pollinations reconnect errors should not log the application user out. Detailed backend error arrays/request IDs are not retained on the client error object.

| Method and path | Access | Request → successful `data` |
| --- | --- | --- |
| GET `/health` | Public | Service/status/timestamp; no dependency probe |
| GET `/health/ready` | Public | Executes `SELECT 1`; service readiness |
| GET `/users/me` | Auth | Synced profile plus computed entitlements |
| GET `/stories` | Public | `limit`, `offset` → published story array |
| POST `/stories` | Auth + generation entitlement + idempotency | Four form fields → 202 `{id,storyId,slug,status,user}` |
| GET `/stories/me` | Auth | `status=draft|published`, limit/offset → `{items,pagination}` |
| GET `/stories/me/:storyId/status` | Owner | Status, generationStatus, errorMessage, completedImages, totalImages, slug |
| POST `/stories/:storyId/resume` | Owner + entitlement + idempotency | No required body → 202 draft/navigation data |
| GET `/stories/slug/:slug` | Public | Published story or 404 |
| GET `/stories/id/:storyId` | Public | Published story by public UUID or 404 |
| GET `/stories/:storyId/related` | Public | `storyType`, limit/offset → `{stories,totalCount}` |
| GET `/stories/:storyId/creator-pack` | Auth + `canExport` | Published story → `{characters,scenes}`; not restricted to its owner |
| DELETE `/stories/:storyId` | Owner | Deleted public story ID |
| POST `/interactive-stories` | Auth + Creator + idempotency | Four form fields → 201 `{storyId,user}` |
| GET `/interactive-stories/me` | Auth | limit/offset → paginated owned interactive summaries |
| GET `/interactive-stories/:storyId` | Owner | `{story,nodes,completedSlug?}` |
| POST `/interactive-stories/:storyId/choices` | Owner + Creator + idempotency | `choice` or `selectedChoice` → updated state |
| POST `/interactive-stories/:storyId/complete` | Owner; Creator for new generation | Optional choice, defaults to `End Story`; idempotency → completed state/slug |
| DELETE `/interactive-stories/:storyId` | Owner | Deleted story ID |
| POST `/images/pollinations-url` | Auth + generation access | Prompt, optional width/height/seed → persisted `{imageUrl}`, despite route name |
| POST `/images/persist` | Auth; provider generation enforces entitlements | `imageUrl` → `{assetId,dataUrl,secureUrl,publicId,bytes}`; dataUrl is a delivery URL |
| GET `/pollinations/status` | Auth | Connection state, username, expiry, optional balance |
| POST `/pollinations/connect` | Auth | Authorization URL |
| POST `/pollinations/callback` | Auth | `code`, `state` → connection status |
| DELETE `/pollinations/connection` | Auth | Locally disconnected state |
| GET `/payments/availability` | Public | `{checkoutEnabled}` |
| GET `/payments/subscription` | Auth | `{user,checkoutEnabled}` |
| POST `/payments/subscription` | Auth + checkout enabled | 201 `{subscriptionId,key}`; key is the checkout key ID |
| POST `/payments/subscription/verify` | Auth + subscription owner | `razorpayPaymentId`, `razorpaySubscriptionId`, `razorpaySignature` → status |
| POST `/payments/subscription/refresh` | Auth + subscription owner | Fetch provider invoices/state → status |
| POST `/payments/subscription/cancel` | Auth + subscription owner | Cancel renewal → status |
| POST `/payments/razorpay/webhook` | Provider signature | Raw JSON + `x-razorpay-signature` → processed/ignored status |
| GET `/admin/stories` | Auth + admin | limit/offset → items, pagination, genre summary |
| GET `/admin/users` | Auth + admin | limit/offset → items, pagination, Creator count |
| DELETE `/admin/stories/:storyId` | Auth + admin | Delete story and tracked images |
| DELETE `/admin/users/:userId` | Auth + admin | Internal profile UUID; rejects financial history |
| POST `/admin/stories/backfill-slugs` | Auth + admin | Optional limit up to 1000 → all zero counts; no-op |

Route/controller definitions are in `server/src/routes/` and `server/src/controllers/`; accepted shapes are in `server/src/validations/`. Pagination defaults to 12 and caps at 50. Public `/stories` normalizes raw query values rather than applying the exported public query schema. Related stories prioritize a supplied genre and then use random ordering; this is not stable pagination or personalized recommendation.

External integrations observed in code: Gemini SDK calls; Pollinations authorization, token exchange, user info, key permission, balance and image endpoints; Cloudinary upload/deletion; Razorpay plan/subscription/payment/invoice APIs; Neon auth handlers and JWKS. Real deployment URLs and credentials are intentionally omitted. Provider service implementations are not in this repository.

## 9. Important Technical Decisions

| Choice | Evidence and supported explanation |
| --- | --- |
| Backend-owned domain operations | Client API wrappers, Express services, `client/README.md`: secrets and authorization remain on the backend |
| Stable auth IDs for ownership | User sync/schema and migration docs explicitly use auth ID → profile ID instead of email |
| Managed Neon Auth plus app roles | `auth.middleware.js` and phase-3 notes: identity comes from managed auth; role lookup remains application-owned |
| Cloudinary behind an adapter | `storage/objectStorage.js` and phase-4 notes explicitly separate durable provider identity from delivery URLs; notes record a cost/runway rationale, not a measured current cost comparison |
| Persist text before classic images | Code saves draft/progress and resumes missing images; this visibly supports partial-failure recovery. The reason for using in-process background work instead of a queue is not documented |
| Structured generation plus repair | Gemini response schema and one repair pass reject incomplete output before image work |
| Quota and invoice integrity in PostgreSQL | Migration 0008 row locks, unique keys, payment advisory locks: counters and invoice application must remain coherent across concurrent calls |
| Platform image attempts never refunded | Explicit service comment: a timed-out provider request may still incur cost |
| Ambiguous subscription creation stays locked | Explicit service comment: avoid blindly creating a second mandate |
| Lazy browser-heavy modules | Dynamic flipbook and export imports separate browser-only work; no measured bundle/performance gain is claimed |
| Webpack dev/build | Explicit package scripts; original choice rationale is unknown |

Existing docs are useful decision records but not all describe the current state. Historical credit transactions and synchronous generation descriptions must not override present subscription/draft code. No rationale is invented for React/Next version selection, provider pricing, or product limits.

## 10. Error Handling and Edge Cases

- `asyncHandler` forwards asynchronous controller failures; `ApiError` carries operational status/detail. Production hides unexpected errors behind a generic 500 message, while operational messages remain visible. Structured logs include request ID, method, URL, and status.
- Missing auth is 401; denied plans/admin access is 403; unavailable owned resources commonly return 404; mismatched/reused failed generation keys are 409; running duplicate work is 425; missing/expired Pollinations connection is 428; provider throttling is 429; exhausted shared platform generation capacity is 503.
- Storage maps provider wallet errors (401/402), busy responses (429), unsupported MIME (415), oversize (413), and request timeout (504). No personal image counters remain; Creator platform attempts remain consumed on failure.
- Batch upload failures discard successful siblings; database failure after upload triggers compensation. Cleanup is best-effort and can itself fail; there is no cross-provider/database transaction.
- Classic generation failure retains recoverable content/images. Interactive starter or continuation failure cleans its newly uploaded batch and marks the job failed.
- Gemini story parsing tolerates code fences, surrounding text, smart quotes, and trailing commas, then performs one repair attempt. Interactive parsers use direct JSON parsing and weaker normalization; malformed continuation JSON can become a generic server error.
- Missing images render readable placeholders. Missing story routes use Next's `notFound`. Loaders, disabled controls, toasts, and inline auth/checkout error messages cover major asynchronous paths.
- Explore currently treats fetch failure as end-of-list, without a distinct retry error. Related-story fetching has a `finally` but no local `catch`. Browser clipboard failures and some speech-synthesis cleanup paths are not fully guarded.
- Most story strings are only trimmed/nonempty in Zod, with no field-length or fixed-option constraint. Arbitrary choice strings are accepted rather than checked against the saved choices. An uploaded image's base64 body can exceed the 2 MB parser limit; generic middleware currently recognizes only `ApiError`, so parser errors may be reported as 500 instead of their original HTTP status.

## 11. Performance, Security, and Reliability

### Verified mechanisms

- **Caching/deduplication:** profile/token request maps, concurrent GET deduplication, 60-second server public-story revalidation, sessionStorage explore restore.
- **Bounded loading:** 12-item UI pages, API cap of 50, IntersectionObserver loading, three-worker interactive image batches, sequential classic image persistence.
- **Reduced polling:** hidden-tab pause, progressive delay, deadline, rate-limit cooldown.
- **Media loading:** lazy story images, deferred videos with `preload="none"`, reduced-motion handling in Hero/sequence/video/navbar, local font with swap display.
- **Canvas sequence:** 240 source frames; decoded caches bounded to 18 mobile/36 desktop frames; 4/8 concurrent requests; directional prefetch, nearest-loaded-frame fallback, requestAnimationFrame drawing, cleanup. `/frames/*` gets one-year immutable caching.
- **Security boundaries:** server JWT verification, database role/ownership checks, backend-only provider credentials, AES-256-GCM credential envelopes, PKCE and single-use state, raw webhook HMAC verification with timing-safe comparison.
- **Request/storage controls:** Helmet, explicit origin allowlist, disabled Express branding, 2 MB normal bodies, 256 KB webhook bodies, source HTTPS host allowlist, redirect refusal, JPEG/PNG/WebP MIME checks, 15 MB source-image checks.
- **Financial integrity:** exact amount/currency/invoice relationship checks, paid-period entitlement, replay-resistant invoice inserts, refund/dispute holds, bounded project/image/idea reservations.
- **Operational checks:** environment validation, liveness/database-readiness routes, JSON error logging, migration checksums, dev-branch tooling guard, build configuration integrity test.

### Concerns and limits inferred from the implementation

These are code-based review findings, not live exploit or load-test results.

1. Classic background work is not durable. A process restart can leave a job `running`; `hasRunningStoryGeneration` has no lease expiry/recovery and may block resume indefinitely. Shutdown closes HTTP connections but does not explicitly drain background jobs.
2. No general API request-rate limiter is mounted. The roadmap explicitly records its removal; monthly usage quotas are not per-second abuse controls.
3. `publicStory` removes character/image prompts from `output` but spreads top-level story fields, retaining `userEmail` and `ownerId`. Public list/detail responses therefore are not a strict privacy projection.
4. Draft story URLs are private at the API layer, but asset uploads are public delivery objects. Private media delivery is not implemented despite an `access` column supporting that value.
5. Creator pack authorization permits any Creator to request any published story's pack. The UI's PDF gate cannot prevent copying publicly readable content; it is not DRM. Whether packs should be owner-only is a product-policy question.
6. Classic matching-draft/running-job checks and slug selection are read-before-write operations. Distinct idempotency keys can race; unique slug constraints may reject a collision without retry. Interactive active-node uniqueness limits committed state but does not serialize pre-commit provider work or all completion races.
7. Provider fetch timeouts cover the initial `fetch` promise; timers are cleared before subsequent `arrayBuffer()`/JSON reads. Undeclared large bodies are buffered before the size check. Gemini and Pollinations OAuth/account calls have no explicit application timeout.
8. Public list queries return full narrative JSON when cards mainly need summaries. Related-story `RANDOM()` plus offset can repeat/skip results; growing infinite-scroll lists are not virtualized. No load/egress benchmarks were run.
9. Legacy browser image fallback selects `flux` with `safe=false` and no auth headers, whereas backend-generated images use the configured model and `safe=true`. Availability and safety behavior of that fallback are unverified; provider flags are not a complete moderation system.
10. Five-minute profile caching can temporarily show stale permissions. Server checks still enforce current entitlement. GET deduplication keys omit options other than path/token, so differing signals/cache/header requirements can share a request.
11. No verified content moderation workflow, audit-event pipeline, background reconciliation worker, telemetry dashboard, backup automation, or browser E2E suite was found. Existing operational notes do not prove these are deployed externally.

## 12. Setup and Execution

### Prerequisites and local setup

The backend declares Node **22.x** and npm **10.x**. Use those versions for the documented workflow. Both applications have npm lockfiles and install independently. Required external services depend on the feature exercised: PostgreSQL on Neon with Managed Auth for signed-in flows; Gemini, Pollinations, and Cloudinary for illustrated generation; Razorpay plus platform funding for Creator checkout.

From the repository root, install each package separately:

```sh
cd server
npm ci
# Copy only if no local environment file already exists:
cp .env.example .env
```

Edit the new local environment file before starting. The tracked server template defaults to **production**; for local development change `NODE_ENV=development`, set `CLIENT_ORIGIN=http://localhost:3000`, and use a matching local `CORS_ORIGIN`. Supply development-service credentials privately. `DATABASE_URL` must point to the intended database; `NEON_AUTH_BASE_URL` and JWKS must correspond to its auth instance. A bare database without managed-auth tables is insufficient for `/users/me` and entitlements.

For an intended disposable/development database branch only:

```sh
# Requires DATABASE_URL_UNPOOLED and NEON_BRANCH=dev/<your-branch>
npm run db:migrate
# Optional demo records, not a usable seeded auth login:
npm run db:seed
npm run dev
```

The migration runner checks the supplied `NEON_BRANCH` string, not the actual remote branch identity. Verify the connection target independently; do not relabel a production connection to bypass this guard. Migration history/checksums are stored in `public.app_schema_migrations`; an applied SQL file cannot be silently edited. The checked-in migration script refuses non-`dev/*` branch labels; a production migration procedure is not implemented by that command.

In another terminal, from repository root:

```sh
cd client
npm ci
# Copy only if no local environment file already exists:
cp .env.example .env.local
npm run dev
```

Set `API_BASE_URL=http://localhost:8000/api/v1` in the client file: its template uses an example remote URL. Configure private `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`. Next defaults to port 3000; Express defaults to 8000. `/api/v1/health` checks the API process; `/api/v1/health/ready` checks database connectivity only.

Register appropriate local auth origins/callbacks in the managed provider. The Pollinations callback constructed by the code is `${CLIENT_ORIGIN}/pollinations/callback`. Provider-side setup and actual account permissions require separate verification; no real endpoints/keys are embedded here.

### Environment inventory

| Location / variables | Purpose |
| --- | --- |
| Server `NODE_ENV`, `PORT`, `CLIENT_ORIGIN`, `CORS_ORIGIN` | Runtime mode, listener and allowed browser origins |
| Server `TRUST_PROXY` | Hop count or verified IP/CIDR list; defaults to one hop in production, false otherwise; boolean strings rejected |
| Server `DATABASE_URL` | Application database connection |
| Tooling `DATABASE_URL_UNPOOLED`, `NEON_BRANCH` | Migration/direct connection and dev guard; not application runtime requirements |
| Both apps `NEON_AUTH_BASE_URL`; server `NEON_AUTH_JWKS_URL` | Auth service and bearer verification |
| Client `NEON_AUTH_COOKIE_SECRET` | Private Next auth cookie configuration |
| Client `API_BASE_URL` | Private backend URL for rewrites/server fetches, including `/api/v1` |
| Server `GEMINI_API_KEY`, `GEMINI_MODEL`, `CREATE_STORY_PROMPT` | Generation credentials; model defaults to `gemini-2.5-flash`; optional prompt template placeholders |
| Server `POLLINATIONS_APP_KEY`, `POLLINATIONS_IMAGE_MODEL`, `POLLINATIONS_TOKEN_ENCRYPTION_KEY` | OAuth app key, configured model (default `black-forest-labs/flux.1-schnell`), encryption secret of at least 32 characters |
| Server `POLLINATIONS_PLATFORM_KEY`, `POLLINATIONS_PLATFORM_MONTHLY_ATTEMPT_LIMIT` | Creator image funding and global UTC-month attempt cap |
| Server `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_STORY_FOLDER` | Persistent image storage; folder defaults to `talecrafter/stories` |
| Server `CREATOR_CHECKOUT_ENABLED` | New-checkout feature gate, false by default |
| Server `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_CREATOR_PLAN_ID` | Subscription provider config; webhook secret minimum 32 characters in environment validation |

Production validation requires database/auth, origins, Gemini, Pollinations OAuth/encryption, and Cloudinary configuration. Enabling Creator checkout additionally requires complete Razorpay configuration, platform key, and positive attempt cap. Disabling new checkout does not eliminate the needs of existing paying subscribers. Preserve the encryption key across deployments to keep existing Pollinations connections decryptable. No app secret should use a `NEXT_PUBLIC_` prefix.

### Commands and deployment

| Working directory | Command | Effect |
| --- | --- | --- |
| `client` | `npm run dev` | Build-safety precheck, then Next dev with Webpack |
| `client` | `npm run build`, `npm start` | Build-safety precheck + Webpack production build; serve built app |
| `client` | `npm run typecheck`, `npm run lint` | TypeScript no-emit and ESLint |
| `client` | `npm run check:build-safety` | Static build configuration checks only |
| `client` | `node --test test/*.test.mjs` | All three frontend test files; no `npm test` script exists |
| `server` | `npm run dev`, `npm start` | Nodemon or direct Node API runtime |
| `server` | `npm run build` | Runs `check` and unit tests; no compilation/bundle output |
| `server` | `npm run check` | ESLint plus Prettier check |
| `server` | `npm test` | Explicit seven-file unit suite |
| `server` | `npm run test:integration` | Isolated PGlite payment/generation tests with experimental module mocking |
| `server` | `npm run test:generation` | Generation integration subset |
| `server` | `npm run db:generate`, `npm run db:migrate` | Generate SQL; apply SQL with checksums/dev guard (`migrate` is an alias) |
| `server` | `npm run db:verify`, `npm run test:auth`, `npm run test:storage` | Opt-in tests that access real configured services and may create/delete fixtures |
| `server` | `npm run user:set-role -- <auth-user-id> <user\|admin>` | Mutate existing application profile role; sign in once before bootstrap |
| Both | `npm run lint:fix` | Mutating lint fixes; not part of this analysis |
| `server` | `npm run format`, `npm run format:check` | Mutating formatting or read-only format check |

Deploy Next and Express as separate services with matching private backend/auth configuration and browser origins. Webhooks must reach the raw backend route. Classic background jobs require an API lifecycle that continues after sending the response; short-lived request execution would be a deployment mismatch. Live billing activation, ingress forwarding headers, provider budgets, backups, and restoration are operational work, not confirmed by successful unit tests. See `docs/architecture/creator-subscriptions.md` for the existing rollout record, with current implementation taking precedence over historical notes.

## 13. Testing and Quality

Tests executed during this documentation pass using existing installed dependencies:

| Command | Result | Scope |
| --- | --- | --- |
| Server `npm test` | **41 passed**, 0 failed | Environment, Gemini parsing/repair, pagination, entitlement/signature utilities, Pollinations, proxy settings, storage adapter |
| Server `npm run test:integration` | **2 passed**, 0 failed | PGlite subscription lifecycle and generation reservation tests |
| Client `node --test test/*.test.mjs` | **8 passed**, 0 failed | Build safety, polling, story text |

`server/test/helpers/subscription-db.js` creates ephemeral PGlite, applies journal migrations, supplies a minimal managed-auth schema, and mocks the production database module. Payment integration mocks Razorpay. Coverage includes concurrent quota reservations, same-key replay, failed-usage release, platform attempt nonrefund, captured invoices, checkout concurrency, refunds/disputes, and delayed events. These are service tests, not real checkout or full browser tests. Node emits an expected experimental module-mocking warning.

Frontend utility tests transpile TypeScript into a VM with mocked browser/time/API objects. They are not React rendering tests. Build-safety tests hash the reviewed PostCSS source without executing it and check for specific previously identified disguised-executable/editor-task patterns. This is a targeted regression guard, not a general malware scanner.

Existing opt-in auth/database tests create and clean up remote fixtures; storage integration mocks the image source but performs real Cloudinary upload/delivery/deletion. None were run here. Production builds, lint, and type checking were not run during this documentation-only pass; the listed test results do not imply those checks pass. No browser E2E, visual regression, measured coverage percentage, or full provider-backed generation run was performed.

## 14. Challenges and Improvement Opportunities

Recommendations below are separate from implemented behavior; they were not applied.

| Priority | Concrete issue / complexity | Suggested next work and evidence |
| --- | --- | --- |
| High | Background job can remain running after process loss | Durable queue or lease/heartbeat/recovery; test restart and partial resume. `story.service.js`, `generationJob.service.js`, `index.js` |
| High | Public response retains author email/internal owner ID | Use an explicit public DTO and test top-level privacy as well as prompt stripping. `utils/publicStory.js`, story selection |
| High | Distinct-key generation races and stale-node completion | Serialize/CAS active-node transitions before expensive work; add simultaneous continue/complete/resume tests. Interactive/story services and partial unique index |
| High | Checkout stuck in ambiguous `creating` state | Add an audited reconciliation tool/job that matches provider metadata rather than creating another mandate. `payment.service.js` |
| High | Provider/database compensation is not atomic | Record cleanup/reconciliation tasks, coordinate deletion with running generation, and test failed cleanup. `asset.service.js`, story/admin services |
| Medium | Cached classic replay omits user | `resolveExistingJob` returns no user; classic cached branch reads `reservation.user` without fallback. Fetch current profile on replay if response contract needs it. `generationJob.service.js`, `story.service.js` |
| Medium | Classic same-key retry can change hash after draft attachment | Hash includes `storyId`; initial creation can use null while later matching draft supplies its ID. Test failed-response retries after draft creation and define a stable request identity |
| Medium | Validation does not fully match storage/schema | Bound strings to database limits, constrain genres/styles where appropriate, validate choice membership. `validations/` |
| Medium | API parser failures lose intended status | Normalize body parser and other known middleware errors before generic 500 handling. `error.middleware.js` |
| Medium | Storage reads lack end-to-end timeout/streaming limit | Maintain abort deadline through body reads and stop streaming at the byte budget. `cloudinary.storage.js` |
| Medium | Polling lacks unmount cancellation | Add AbortSignal/deadline-aware visibility waiting. Hidden tabs can retain the listener until visible even after the nominal deadline. `story-generation.ts` |
| Medium | Browse caches/errors obscure freshness | Define cache expiry/invalidation and explicit retry states; catch related requests; stable pagination. Explore/reader/story services |
| Medium | Admin search only covers loaded records | Implement server-side search/filter before paging; make UI search scope clear. `client/app/admin/page.tsx` |
| Medium | Identity types drift | `StoryRecord.id` is typed number although current DB ID is UUID; unify shared DTOs and add runtime response checks where useful. `client/lib/story-data.ts`, `types/story.ts` |
| Medium | Historical helper no longer matches schema | `server/scripts/story-length-report.mjs` queries legacy `storyData`; migrate or explicitly retire it. Do not treat it as a working current-schema report |
| Medium | No-op slug maintenance endpoint | Remove/deprecate or implement with a defined migration use case. `admin.service.js` |
| Medium | Browser compatibility/accessibility | Guard speech synthesis in cleanup, expose share errors, audit keyboard/focus/reduced motion and raster PDF accessibility. Reader, StoryPages, text effects |
| Medium | Account deletion semantics | Decide whether admin deletion is profile reset or account removal; current managed-auth account survives. `admin.service.js`, `user.service.js` |
| Lower | Large components and duplicated contracts | Extract reader export/narration and interactive state hooks; consolidate client/server image normalization and plan presentation contracts |

No measured latency, cost savings, throughput, or business impact is asserted for these recommendations.

## 15. Interview Preparation

Use these outlines to explain the actual code and its limits.

1. **What is the architecture?** Next App Router owns pages and auth proxy; Express owns domain APIs, authorization and provider calls; Drizzle connects to PostgreSQL; media is stored through a Cloudinary adapter. Trace `layout.tsx` → `apiFetch` → route → controller → service.
2. **Why is this not React Native?** It renders DOM with Next.js, uses browser storage/canvas/speech/share APIs and CSS. A React Native port would need native navigation, rendering, secure storage and different PDF/media integrations; no such port is implemented.
3. **Where are server/client boundaries?** Slug pages fetch on the server and pass `initialStory`; interactive components use client hooks. Flipbook is imported with `ssr:false`; PDF tools load on demand. Next auth route handlers keep cookie configuration server-side.
4. **How is state shared?** Session/profile/entitlements use context; forms, lists, reader state are local. Child selections and narration report through callbacks. Refs retain idempotency keys and imperative book handles.
5. **Why use functional state updates and refs?** Async handlers must merge against current state; refs prevent duplicate in-flight actions and retain values without rerender. Explain `setFormData(prev => ...)` and dashboard `loadingRef`.
6. **How do effects avoid stale responses?** Provider ignore flags and dashboard captured-user checks help. Remaining limitations include missing AbortSignals and cached permission freshness.
7. **How does authentication differ from authorization?** Managed Auth signs in; Express verifies JWT signature/issuer/audience; role and owner checks query app data. Hidden buttons and proxy redirects do not authorize API mutations.
8. **Why not authorize by email?** Email can change and is profile data; JWT subject maps to a unique auth ID and internal UUID. Explain the upsert in `syncUserFromAuth`.
9. **How are simultaneous token requests handled?** Shared promises coalesce requests; token generation guards prevent a stale response repopulating the cache; recognized API 401 triggers one forced refresh.
10. **What does idempotency guarantee here?** Unique owner/key plus canonical SHA-256 request hash prevents duplicate same-key jobs and rejects changed payloads. It does not serialize different keys or make external side effects transactional. Mention the classic draft/hash edge case.
11. **Trace classic creation after an image fails.** Text and individual images are already stored; the job becomes failed; saved images persist. Resume generates missing images. Platform attempts remain consumed; no personal project quota applies. Contrast this with a process crash leaving a running job unrecovered.
12. **Why structured JSON and a repair prompt?** Provider schema constrains shape; local normalization still validates; one repair attempt avoids proceeding with incomplete pages. Interactive continuation parsing is less defensive.
13. **How is an interactive narrative represented?** Parent-linked nodes with pages/choices and one active-node index. Walk parents, reverse the chain, flatten pages. It models the selected path; arbitrary branch revisiting is not exposed.
14. **How do quotas resist concurrent overspend?** SQL function locks the bucket row, checks unique reservation, checks cap, inserts reservation and increments. Release locks/deletes once. Explain why a JavaScript read-then-increment would race.
15. **What does `Promise.all` buy you here?** Independent list/count queries run concurrently; bounded workers control provider concurrency. `allSettled` is used for best-effort compensation. Rejected provider work must still release reservations.
16. **Why not grant paid access in the checkout callback alone?** Callback is browser-supplied; server verifies signature/ownership and independently fetches captured payment and paid invoice with exact amount/currency/period linkage.
17. **How are duplicate/out-of-order webhooks handled?** Unique invoices, advisory locks, only-forward paid-through update, separate holds, and fetching current provider status. Explain refund-before-invoice tests.
18. **Why persist provider object keys?** Delivery URLs can change; provider/container/key identify objects for deletion. Adapter isolates Cloudinary operations. DB rollback cannot undo a remote upload, so compensation is required.
19. **How is SSRF limited?** Storage permits HTTPS and two specific image hosts, refuses redirects, validates MIME/size. Remaining gaps include full-body buffering and deadlines not spanning body reads.
20. **How would you debug a stuck generation?** Capture request ID and job/public story IDs; inspect job status, missing persisted images, provider errors and entitlement; check process restart. Do not blindly start another paid request. No recovery worker currently exists.
21. **How would you debug a paid user shown as Free?** Compare context cache with `/payments/subscription`, inspect paid dates/revocation, verify captured invoice linkage, refresh provider state, inspect holds. Provider status alone is insufficient.
22. **What performance optimizations are proven?** Describe implemented caching, polling backoff, lazy imports and bounded frame cache. Do not claim faster load times without measurements. Identify full-story list overfetching and random ordering as follow-up work.
23. **How does PDF export work and what are tradeoffs?** Authenticated feature check, DOM clone, image fetch/retry, canvas rasterization, A4 JPEG pages, cleanup. Discuss memory, CORS, accessibility, text selection and browser differences.
24. **What is covered by tests?** Unit contracts and PGlite service transactions; providers mocked. Auth/storage live tests are opt-in; no browser E2E proof. Propose crash recovery and concurrent interactive transition tests.
25. **What would you fix first?** Tie priority to observed risk: durable jobs, public privacy DTO, provider reconciliation/concurrency, validation and browser tests. Explain why each can fail in this implementation.

## 16. Resume-Relevant Contributions

The repository supports the following engineering topics. It does **not** establish who authored them. Use these bullet templates only for work you personally implemented or can substantiate; otherwise describe them as project capabilities you studied.

- Implemented a Next.js and Express illustrated-story workflow integrating Gemini narrative generation, Pollinations images, and Cloudinary persistence.
- Built resumable classic-story drafts with per-image persistence, generation status polling, and backend job tracking.
- Developed interactive story continuation using parent-linked PostgreSQL nodes, character context, choice locking, and final-book compilation.
- Integrated managed authentication with verified bearer tokens, stable user-ID ownership, role checks, and client token refresh handling.
- Implemented subscription entitlements using verified Razorpay invoices, signed webhooks, replay protection, cancellation, and refund/dispute handling.
- Added transactional usage reservations with PostgreSQL row locks and idempotent release behavior.
- Built responsive story libraries, browser narration, link sharing, on-demand PDF export, and Creator character/scene views.
- Created a storage adapter with persistent object identity, source validation, and compensating cleanup.
- Added unit and isolated PostgreSQL integration tests covering generation contracts, quota concurrency, payment verification, and refund ordering.
- Implemented deferred media loading and a bounded scroll-animation frame cache.

Do not claim native mobile development, a deployed video-generation system, ownership of the complete project, a durable distributed queue, production-scale reliability, quantified optimization gains, user counts, revenue, or business impact from repository evidence alone. Test counts in this document are verification results, not business achievements.

## 17. Knowledge Gaps to Address

| Priority | Study area | Project-specific exercise |
| --- | --- | --- |
| 1 | Distributed work and failure recovery | Design a job lease, heartbeat, retries, and recovery protocol for classic images without duplicating billed provider work |
| 1 | PostgreSQL transactions/concurrency | Explain row locks, unique constraints, partial indexes, advisory locks, and quota functions; reproduce competing interactive transitions in an isolated test |
| 1 | Authentication/security boundaries | Explain JWT verification vs client expiry decoding, session refresh, OAuth PKCE/state, app roles, ownership and least-data public responses |
| 1 | Payment state machines | Trace authorization vs capture vs invoice settlement, idempotency, refunds, disputes, delayed events, and ambiguous subscription creation |
| 2 | React asynchronous state/effects | Explain refs vs state, functional updates, stale closures, cleanup, cancellation, and context cache invalidation |
| 2 | Next.js server/browser execution | Trace App Router params, server fetch revalidation, route handlers, proxy, rewrites, and lazy browser dependencies using this installed version's docs |
| 2 | AI output validation | Compare provider response schema, local validation, repair, prompt injection risks and moderation; strengthen continuation parsing |
| 2 | Storage and network safety | Study streaming byte limits, abort deadlines, source allowlisting, deletion retries, object identity and public/private media |
| 2 | Testing strategy | Add browser user journeys and service race/failure tests; distinguish PGlite behavior from live Neon/provider evidence |
| 3 | Performance measurement | Measure API payloads, database query plans, browser memory, canvas decoding, PDF cost and cache freshness before claiming improvements |
| 3 | Accessibility/platform differences | Keyboard/focus management, reduced motion, unsupported browser APIs, PDF accessibility; understand what a React Native port would replace |
| 3 | Production operations | Define migration release, secret rotation, provider budgets, reconciliation, log redaction, monitoring, backup and restore procedures |

### Inspection boundaries

Inspected application source and major component logic across `client/app`, `client/components`, `client/lib`, `client/types`; Express routes/controllers/services/middleware/validation/storage/utilities; schema and SQL migrations; scripts, manifests, example environments, configuration, tests, and migration/architecture records. Static marketing markup/style and bundled media were assessed for structure and runtime use rather than visually validating every asset. Migration snapshot JSON is generated history; SQL/current schema were the primary persistence evidence.

Private `.env` values, cloud credentials, deployment metadata, Git history attribution, live account/database contents, and provider dashboards were excluded. Dependency/vendor/generated build trees and local tooling installations were not exhaustively audited. No relevant application source access failure was encountered. Live AI responses, OAuth/email delivery, paid checkout, deployed migrations, ingress behavior, external backup/monitoring, browser rendering and production performance remain unverified. Only this new documentation file was created; existing files were preserved.
