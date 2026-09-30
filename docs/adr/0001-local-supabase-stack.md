# ADR 0001: Develop against a trimmed local Supabase stack

- **Status:** Superseded by [ADR 0002](0002-firestore-over-postgres.md)
- **Date:** 2026-09-22
- **Decider:** Matt Freeman

> Kept for history. The backend moved off Supabase/Postgres entirely (see ADR 0002), so
> everything below — the local stack, its containers, its commands — no longer exists in this
> repo. Nothing here was ever deployed, so no live data or environment needed migrating.

## Context

The backend (three Edge Functions — `signup`, `capture`, `recall` — plus a Postgres schema) was
written for hosted Supabase but never deployed. Before deploying, we need somewhere to run and
iterate on it: fix recall's search ranking, fix reminder timezone handling, and try parsing
changes against real data.

Options considered:

1. **Free hosted Supabase project as the dev environment** — deploy on every change.
2. **Hybrid** — run the functions locally with plain Deno, pointed at a hosted Supabase database.
3. **Trimmed local Supabase stack** — the Supabase CLI running only the containers this app uses,
   in Docker.
4. **Supabase Branching** — per-branch preview projects (paid plan, team-oriented).
5. **Hand-rolled Postgres + PostgREST in docker-compose** — needs a proxy to mimic Supabase's
   URL layout.

## Decision

Use **option 3: a trimmed local Supabase stack**.

The drivers:

- **Independence and offline work.** Development shouldn't depend on a network connection, a
  hosted project's uptime, or the free tier pausing an inactive project.
- **More local control.** The database is ours to reset, reseed, and inspect directly
  (`supabase db reset`, `psql` on port 54322) with no dashboard round-trips and no quotas.
  Migrations under `supabase/migrations/` are the schema's source of truth and apply the same way
  locally and when deployed.
- **Not stepping on production's toes.** Experiments, broken migrations, and test data stay on
  this machine. Nothing done while developing can touch a hosted database that real Shortcuts
  point at.
- **Fidelity.** It runs the same Postgres, PostgREST, and Edge Runtime as hosted Supabase, so the
  function code needs no changes and full-text search behaves the same as in production.

**Option 2 (hybrid) was the runner-up** and is the natural next step. It drops Docker entirely,
gives instant reloads with `deno run --watch`, and — because the database is hosted — lets an
iPhone Shortcut reach it from anywhere without a tunnel. It lost here because it gives up offline
work and puts dev traffic on a hosted database. Revisit it once we start building the Siri
Shortcuts and need phone access away from the home network.

## How it's trimmed

The app uses only the database (through the service-role key) and the functions runtime. It
doesn't use Supabase Auth, Storage, Realtime, or Studio. In `supabase/config.toml` these are
disabled: `realtime`, `studio`, `local_smtp`, `storage`, `auth`, `analytics`.

A plain `supabase start` therefore runs 4 containers:

| Container    | Role                         | Idle RAM (measured) |
|--------------|------------------------------|---------------------|
| postgres     | Database                     | ~67 MB              |
| postgrest    | REST API used by supabase-js | ~40 MB              |
| kong         | API gateway on :54321        | ~94 MB              |
| edge-runtime | Serves the Edge Functions    | ~26 MB              |

That's about 225 MB of RAM at idle and about 2.1 GB of images on disk, versus roughly 12
containers and 1.5–2.5 GB of RAM for the default stack. To browse tables in a web UI, set
`[studio] enabled = true` (adds roughly 200–300 MB).

The functions set `verify_jwt = false` in `config.toml`, because callers authenticate with the
`x-app-key` header instead of a Supabase JWT.

## Consequences

- Docker must be running, and the CLI is a project dev dependency (`npx supabase ...`). Homebrew
  isn't installed, and the CLI doesn't support a global npm install.
- Project layout now follows CLI conventions:
  - `supabase/functions/{signup,capture,recall}/index.ts`
  - `supabase/migrations/20260922000000_init.sql` (was `schema.sql`)
- An iPhone can reach the local stack only on the same Wi-Fi (Mac's LAN IP, port 54321) or
  through a tunnel, and only while the Mac is awake. This limitation is what would push us to
  option 2 later.
- The edge runtime container runs in UTC, the same as hosted Supabase. That's useful: timezone
  bugs show up locally instead of hiding until deploy.

## Day-to-day commands

```bash
npx supabase start      # bring the stack up (applies migrations on first start)
npx supabase stop       # shut it down (data is kept)
npx supabase db reset   # wipe and re-apply migrations
npx supabase status     # URLs and keys
```

Endpoints: `http://127.0.0.1:54321/functions/v1/{signup,capture,recall}`
