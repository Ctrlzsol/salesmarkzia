# Al-Markazia — Decision Support Engine

A multi-tenant Arabic (RTL) POS analytics platform. An admin manages clients
from a password-protected dashboard, and each client gets its own persistent
analytics page at `/:clientSlug` backed by Postgres.

## Stack

- React 19 + Vite 6 + TypeScript + Tailwind v4 (RTL)
- Express server (`server.ts`) serving both the API and the SPA
- Postgres with Drizzle ORM (`db/schema.ts`)

## Routes

- `/` — landing page: pick a client
- `/admin` — password-protected admin (create/edit/delete clients, upload data)
- `/:clientSlug` — the client's persistent dashboard

## Environment variables

See [.env.example](.env.example). Required: `DATABASE_URL`, `ADMIN_PASSWORD`,
`SESSION_SECRET`. Optional: `GEMINI_API_KEY` (falls back to the local rules
engine when unset). The server refuses to start if a required secret is missing.

## Run locally

1. Install dependencies: `npm install`
2. Set the required environment variables (see above).
3. Create the database schema: `npm run db:push`.
4. Run the app: `npm run dev` (serves on port 5000).

## Tests

Run the automated regression suite with a single command:

```
npm test
```

It uses the built-in Node test runner (`node:test`) via `tsx`, runs the files
in `tests/`, and exercises the live API over an ephemeral HTTP port against the
configured `DATABASE_URL`. Coverage:

- admin login success/failure and session state
- unauthenticated mutations rejected with 401
- CSRF rejection of cross-origin / no-origin mutations (403)
- reserved slug handling (`admin`/`api` never assigned to a client)
- record insert + read-back, plus rejection of unparseable dates
- per-client data isolation by slug
- `/api/analyze` honest-growth fallback (no fabricated growth with <2 months)

The suite cleans up any clients it creates (cascade-deleting their batches and
records), so it is safe to run repeatedly. The analyze tests rely on the local
rules engine, which is active whenever `GEMINI_API_KEY` is unset.

## Database schema & migrations

The schema lives in `db/schema.ts`; SQL migrations are committed under
`drizzle/`.

- `npm run db:generate` — generate a new migration after editing the schema.
- `npm run db:migrate` — apply committed migrations to a database.
- `npm run db:push` — push the schema directly to the dev database.

## User preferences

- (none recorded yet)
