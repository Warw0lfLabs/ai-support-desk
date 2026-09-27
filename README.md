# AI Support Desk

A small support workspace built with Next.js, strict TypeScript, PostgreSQL, Prisma, Zod, and Tailwind CSS. Create tickets, triage them, search and filter the queue, and review AI-generated summaries and response drafts.

**Shared synthetic-data demo. There is no authentication. Anyone who can reach the application can read and modify its tickets. Do not enter personal information, credentials, or real customer data.**

## Local quick start

Prerequisites: Node.js 22.12+ (22.x), npm 10+, Docker with Compose.

```sh
cp .env.example .env
npm ci
npm run db:generate
docker compose up -d db --wait
npm run db:migrate
npm run db:seed
npm run dev -- --webpack
```

Open http://localhost:3000. Mock AI is enabled by default and requires no API key. The placeholder database password is for loopback-only local development; replace it consistently in `POSTGRES_PASSWORD` and `DATABASE_URL` for any other environment.

The development database uses host port **5434** to avoid the commonly occupied 5432. The application connects to port 5432 inside Compose. The isolated test database uses host port **5433**. If a port is occupied, update Compose and the corresponding connection string together.

For a local production build:

```sh
npm run build
npm start
```

## Usage

- The dashboard shows workspace-wide status counts, newest tickets first, and numbered pagination (20 tickets per page by default).
- Search matches literal title/conversation-message text, case-insensitively. Status, category, and priority filters combine with AND. Filters live in the URL.
- Create a ticket with a title and description. The ticket is saved before the browser requests analysis.
- Change status on the detail page. A resolved ticket must be reopened before it can move into progress.
- Review the AI summary, recommended category/priority, and suggested response. Click **Use reply** to place the suggestion in the support composer, edit it, then explicitly **Send reply**. Replacing an existing draft requires confirmation. AI never sends a message.
- If analysis fails or is interrupted, retry from the detail page. Fresh successful analysis is reused; new conversation activity makes it stale. **Refresh analysis** is required before using a stale suggestion.

Use the clearly labeled **Demo tools → Add customer reply** form to simulate incoming customer context. This is not a customer portal; it is enabled only by the server-side `DEMO_CUSTOMER_REPLIES=true` flag.

The seed creates 24 deterministic synthetic tickets with varied statuses and analysis states, including six multi-message conversations and a stale-analysis example. Running it again does not duplicate tickets or overwrite your changes to existing seed records.

## Architecture

```text
Server Components ───────┐
                        ├─ Application services ─ Repositories ─ Prisma ─ PostgreSQL
Browser ─ Route Handlers┘          │
                                  └─ AIProvider ─ Mock / OpenAI-compatible
```

- `src/app`: routes, page composition, loading/error states, HTTP endpoints.
- `src/features`: ticket/analysis contracts, strict schemas, business status rules, interactive UI.
- `src/components`: shared shell, badges, skeletons, empty states.
- `src/server/services`: application operations, concurrency decisions, explicit DTO mapping.
- `src/server/repositories`: scoped persistence and transactions. UI does not import Prisma.
- `src/server/ai`: provider contract and adapters. No provider-specific response shape escapes this layer.
- `src/server/http`: bounded JSON parsing, origin checks, safe responses, and process-local request budgets.
- `prisma`: schema, checked-in SQL migration, and repeatable synthetic seed.

Server reads call the same services as Route Handlers. All server operations use a server-created `synthetic-demo` access context. Adding authentication requires replacing this with a real principal, adding/backfilling ownership, and scoping all repository queries; the existing context is not an authorization mechanism.

### Data and concurrency

`Ticket` contains a UUID, title, status, optimistic status `version`, `conversationVersion`, and timestamps. `TicketMessage` is the authoritative content: immutable body, CUSTOMER/SUPPORT role, timestamp, and a unique per-ticket sequence. Creation accepts `description` but atomically stores it only as the first CUSTOMER message, alongside the ticket and analysis row. `TicketAnalysis` stores result fields, state, provider/model, safe error code, `analyzedConversationVersion`, context omission count, and timestamps. Database constraints also protect required content and successful analysis completeness.

Status updates compare the submitted version in the database update, returning `409` on a stale edit. Analysis uses a `Set` of active ticket IDs in a single Node.js process to reject overlapping calls. The set is cleared in `finally`; after a restart, a persisted `PROCESSING` row can be retried. There are no leases, attempt IDs, workers, or automatic recovery jobs. Do not run multiple application replicas with real AI without replacing this guard with appropriate coordination.

AI is invoked by a separate, awaited HTTP request. Closing the browser before that request begins leaves analysis `NOT_STARTED`. A process crash can leave it `PROCESSING`; the user retries. There is no guaranteed background completion. Appending either role increments `conversationVersion` atomically with message insertion. Clients submit `expectedConversationVersion` and a stable `clientMessageId`; concurrent distinct/stale sends return 409 and preserve the draft; exact idempotent retries return the saved message. Messages sort by sequence, never timestamp alone. Analysis reads a consistent snapshot and records its version; new messages arriving during analysis make the eventual result stale. Status changes do not invalidate analysis. Previous successful results remain visible if refresh fails.

The conversation migration copies old descriptions into opening messages and drops the description column. No dual-write or rolling migration machinery is needed for this synthetic development project. To rebuild the demo from scratch, run `npx prisma migrate reset --force` followed by `npm run db:seed`; this deletes development data. Messages cannot be edited or deleted in the MVP. Submission IDs are retained for retries while the draft remains unchanged; edited drafts and successfully completed submissions get a new ID. Drafts live in browser memory and survive in-page refreshes, but are not saved across navigation or reload. Other browsers see new activity after Refresh conversation; there is no live delivery or polling.

### AI providers

`MockAIProvider` uses deterministic keyword precedence and small category-specific templates that acknowledge recognized references, amounts, timing, error codes, browser details, and feature outcomes. It does not claim actions have been completed. `OpenAICompatibleProvider` uses Chat Completions with strict JSON Schema output, bounded response size, and a configurable deadline. All results are parsed through Zod. Only the title and role/body transcript are sent, plus an omitted-message count. Context contains the opening message and a contiguous recent tail (at most 20 further messages and 32,000 body characters total). Older omitted context is disclosed in the UI; long conversations may lose relevant older details. IDs, timestamps, and other metadata are excluded. The prompt treats both roles as untrusted data and explicitly assists the support agent. No automatic retries or fallback to fabricated mock results occur when a real provider fails.

For real AI, configure:

```dotenv
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your_key_here
AI_MODEL=your_schema_capable_model_here
```

The target must support `response_format: json_schema`, `max_completion_tokens`, and the Chat Completions response envelope. “OpenAI-compatible” is not a guarantee that every third-party endpoint supports these capabilities. The current adapter deliberately fails safely instead of silently degrading output constraints. Provider URLs must use HTTPS. Ticket text is untrusted prompt input, not an instruction source. The provider has no tools and cannot change tickets or send responses.

## API

| Method | Route                                     | Behavior                                                    |
| ------ | ----------------------------------------- | ----------------------------------------------------------- |
| GET    | `/api/health`                             | Database reachability and application health                |
| GET    | `/api/tickets`                            | Paginated summaries and workspace statistics                |
| POST   | `/api/tickets`                            | Create from `title`, `description`; returns 201             |
| GET    | `/api/tickets/:id`                        | Ticket detail, latest 50 messages, cursor, and analysis     |
| GET    | `/api/tickets/:id/messages`               | Latest 50 messages, optional `before` sequence cursor       |
| POST   | `/api/tickets/:id/messages`               | Append SUPPORT reply; returns 201                           |
| POST   | `/api/tickets/:id/demo-customer-messages` | Append simulated CUSTOMER reply when enabled; otherwise 404 |
| PATCH  | `/api/tickets/:id`                        | Update `status` with expected `version`                     |
| POST   | `/api/tickets/:id/analysis`               | Analyze/retry with an empty JSON object body                |

List query parameters: `q` (max 200), `status`, `category`, `priority`, `page` (1–10000), `pageSize` (1–100, default 20). Unknown or repeated query parameters are rejected. Results sort by creation time and UUID descending. Workspace statistics are unfiltered. Category/priority filters use the last successfully saved analysis, which may be stale. The dashboard labels stale classifications “Analysis outdated”.

Both message POST routes accept only `{ body, clientMessageId, expectedConversationVersion }`. Body is trimmed and limited to 10,000 characters. Each logical submission uses one client-generated UUID `clientMessageId`. Exact retries return the original message (201), even with a changed expected revision; reuse with a different body or role returns 409. A per-ticket unique database constraint and transaction lock prevent duplicate insertion. Legacy/opening messages have a null submission ID. The server assigns role and sequence; clients cannot set database message IDs, roles, or timestamps. Detail/message DTOs expose `nextBeforeSequence` for loading earlier history. Analysis DTOs expose `isStale`, snapshot version, and omitted-message count.

Errors use `{ error: { code, message, requestId, fieldErrors? } }`. Malformed requests are `400`, invalid writable fields `422`, missing tickets `404`, conflicts `409`, large bodies `413`, wrong content types `415`, rate limits `429`, and provider/dependency failures `502`/`503`/`504`. Unexpected failures return a generic `500`, never raw errors.

## Environment variables

All application configuration is server-only. `.env` is ignored; `.env.example` contains placeholders only. No variable is exposed using `NEXT_PUBLIC_`.

| Variable                                            | Default / requirement                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | Required PostgreSQL URL                                                               |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose database bootstrap; password required                                         |
| `APP_ORIGIN`                                        | `http://localhost:3000`; exact browser mutation origin                                |
| `AI_PROVIDER`                                       | `mock` or `openai-compatible`; default `mock`                                         |
| `AI_BASE_URL`                                       | `https://api.openai.com/v1`; HTTPS required for real provider                         |
| `AI_API_KEY`                                        | Required only for real provider                                                       |
| `AI_MODEL`                                          | Required only for real provider                                                       |
| `AI_TIMEOUT_MS`                                     | 20000; allowed 100–20000 (10 seconds reserved within the 30-second route budget)      |
| `LOG_LEVEL`                                         | `info`, `error`, `silent`; default `info`                                             |
| `DEMO_CUSTOMER_REPLIES`                             | `false` by default; example enables it for the synthetic demo; restart after changing |
| `ALLOW_DEMO_SEED`                                   | Must be `true` to run seed; synthetic databases only                                  |
| `TEST_DATABASE_URL`                                 | Defaults to local port 5433 database `support_desk_test`; name must end in `_test`    |

The provider timeout is capped at 20 seconds, reserving 10 seconds within the 30-second route budget for database work and response handling. Deployment request timeouts must exceed the configured AI timeout, with room for database operations. A platform with very short request deadlines is unsuitable for this synchronous analysis endpoint.

Production builds use the supported Webpack compiler for reproducible builds across local and container environments. Docker enables `BUILD_STANDALONE=true` internally; normal local builds use `next start`.

## Tests and checks

```sh
docker compose --profile test up -d db-test --wait
npm run db:generate
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration
npx playwright install chromium
npm run test:e2e
docker build -t ai-support-desk:local .
```

The production build must exist before integration and E2E tests. Each suite starts its own production Next.js server (integration ports 3100/3102 for enabled/disabled demo flags; E2E port 3101) and applies migrations to the test database. Tests enforce a database name ending in `_test`, use synthetic content, and delete only records they created. Do not run both suites concurrently on the same test database. No external AI requests are made.

- Unit/component tests: validation, transitions, mock determinism, bounded stream handling, provider contract/errors, service failure/duplicate behavior, accessible form feedback, conversation context budgets, stale suggestions, draft preservation/replacement, and explicit sending.
- API integration tests: actual HTTP plus PostgreSQL, not mocked Route Handler imports. Includes concurrency, constraints, search escaping, pagination, public response contracts, transactional message sequencing/conflicts, history pagination, stale analysis, and server-side demo flag enforcement.
- Playwright: desktop and mobile Chromium flow covering create → analyze → Use reply → edit → send → simulate customer reply → stale analysis → refresh → resolve → search/filter; includes an XSS-shaped payload, horizontal-overflow check, keyboard skip-link check, and axe WCAG A/AA checks on the dashboard, creation form, and detail page, including stale/current analysis states.

CI runs install, formatting, linting, type checking, tests, migrations, seed, production build, and Docker build. It uses PostgreSQL and mock AI without secrets. GitHub Actions are pinned to commit SHAs and dependency updates are configured. Repository-level secret scanning should be enabled when the project is published.

## Docker

To run the complete application:

```sh
cp .env.example .env # only if .env does not already exist
# Change local placeholder values as appropriate.
docker compose --profile app up -d --build --wait
docker compose --profile tools run --rm seed
```

The migration container applies pending migrations before the application starts. Seeding is explicit. The runtime image uses Next.js standalone output and a non-root user. Migration/seed tooling lives in a separate image target. Environment files, generated clients, Git history, test artifacts, and local dependencies are excluded from the build context.

Stop containers without deleting database data:

```sh
docker compose --profile app --profile test down
```

## Security and operational boundaries

- Plain-text React rendering for ticket, conversation, and AI content; no raw HTML or Markdown rendering.
- Strict Zod schemas reject unexpected writable fields. Prisma writes explicitly enumerate fields.
- Parameterized database queries; search wildcard characters are escaped as literals.
- JSON bodies are capped at 64 KiB while streaming, independent of `Content-Length`. AI responses have the same byte cap.
- Same-origin browser mutations, content-type checks, and process-local global budgets of 120 ticket writes and 20 AI requests per minute. These are basic demo protections, not authentication or distributed rate limiting.
- Logs allowlist request ID, operation, safe outcome, and duration. They omit bodies, search strings, credentials, raw provider responses, and database error details.
- API responses use `no-store`. Headers restrict framing, MIME sniffing, referrers, browser capabilities, and resource origins.
- The CSP currently permits inline scripts/styles for Next.js hydration and Tailwind/React styles; development also permits eval and WebSockets. A hardened public deployment should use a tested nonce-based script CSP and HTTPS/HSTS at the ingress.
- Authentication/ownership, durable analysis, distributed limiting, backups, alerting, connection-pool capacity, cost controls, and provider data-retention review are prerequisites for private customer data or a scaled real-AI deployment.

Ticket search spans all message bodies using PostgreSQL substring matching and offset pagination; conversation history uses sequence cursors. This is appropriate for a small workspace, but large datasets need measured query tuning, full-text/trigram indexes, and potentially cursor pagination. Summary statistics always reflect the entire shared workspace.

Pinned dependency overrides for `deepmerge-ts` and `mysql2` address advisories in Prisma CLI transitive dependencies. They are exercised by client generation, migration, and Docker build; revisit them with future Prisma updates. ESLint is pinned to the compatible 9.x release because the current Next.js React/accessibility plugins do not yet work with ESLint 10.

## Troubleshooting

- **Turbopack CSS worker permission error:** the local development environment produced `creating new process → binding to a port → Operation not permitted (os error 1)` while transforming `globals.css`. The same application, CSS, and pinned dependencies built successfully with Turbopack in a clean Linux Docker builder; local and Docker Webpack production builds also pass. This isolates the observed failure to the local worker/execution environment rather than an invalid CSS/configuration requirement. The exact host permission policy was not identified. Production uses the supported `next build --webpack`; the quick start uses `next dev --webpack`. No CSS, security controls, or application features were removed. Plain `npm run dev` still selects Next.js’s default Turbopack development compiler when the environment permits it.
- **Database connection fails:** confirm Docker is running, `docker compose ps` reports healthy, and the host URL uses port 5434.
- **Credentials changed after first startup:** PostgreSQL bootstrap variables do not change an existing volume's credentials. Update the database credentials deliberately; do not delete a volume containing data you need.
- **Prisma imports missing:** run `npm run db:generate` after installation or schema changes.
- **Origin rejected:** set `APP_ORIGIN` to the exact browser origin and restart the app.
- **Analysis stuck in progress:** retry on the detail page after the previous process/request has stopped. Multiple replicas are outside this MVP's concurrency guarantee.
- **Rate limited:** wait one minute. Budgets are shared across clients of the same process.
- **Third-party AI fails:** verify schema-output support and configuration; safe errors intentionally omit upstream details.
