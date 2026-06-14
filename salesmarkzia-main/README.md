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

**Prerequisites:** Node.js + a Postgres database.

1. Install dependencies: `npm install`
2. Set the required environment variables (see above).
3. Create the database schema (see below).
4. Run the app: `npm run dev` (serves on port 5000).

## Database schema & migrations

The schema lives in `db/schema.ts`; SQL migrations are committed under
`drizzle/`.

- `npm run db:generate` — generate a new migration after editing the schema.
- `npm run db:migrate` — apply committed migrations to a database (use this for
  fresh / production environments so schema creation is deterministic).
- `npm run db:push` — push the schema directly to the dev database (fast
  iteration during development).
