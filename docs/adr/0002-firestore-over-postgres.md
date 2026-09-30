# ADR 0002: Move the backend from Supabase/Postgres to Firebase/Firestore

- **Status:** Accepted
- **Date:** 2026-09-28
- **Decider:** Matt Freeman
- **Supersedes:** [ADR 0001](0001-local-supabase-stack.md)

## Context

The backend (three functions — `signup`, `capture`, `recall` — plus a Postgres schema, see ADR
0001) was written for Supabase but never deployed; no live data or users exist. Two independent
reasons prompted a rethink before deploying anything for real:

1. **Cost.** Supabase's free tier caps a person at 2 active projects account-wide, and this is one
   of several hobby projects competing for those slots. Moving to a different free tier (Firebase's
   Spark plan has no project-count cap, and its quotas — 50k reads/20k writes per day, 1 GiB
   storage — comfortably cover a low-traffic personal app) frees up a Supabase slot for other
   projects.
2. **A deliberate chance to learn document-store tradeoffs.** This app's data model is small and
   well-understood (two collections, a couple of predictable query patterns), making it a safe,
   low-stakes place to feel what a document database gives up versus Postgres, rather than reading
   about it.

Since nothing was deployed, this was a clean rewrite, not a data migration.

## Decision

Move the backend to **Firebase**: Firestore for storage, Cloud Functions (Node/TypeScript,
2nd gen) in place of Supabase Edge Functions (Deno/TypeScript).

### Items live in a subcollection, not a top-level collection

`users/{apiKey}/items/{itemId}`, rather than a top-level `items` collection with a `userId`
field. Every item query is then automatically scoped to one user — the equivalent of Postgres's
`where user_id = ...` — with no field to filter on and no composite index to declare.

The cost of this, and the concrete lesson in it: Firestore has no `on delete cascade`. Deleting a
`users/{apiKey}` document does **not** delete its `items` subcollection — a person-deletion
feature would have to walk and delete that subcollection in code. Postgres gave this away for
free with one line in the schema (`references app_users(id) on delete cascade`); Firestore makes
you build it.

### The api_key doubles as the Firestore document id

`users/{apiKey}` instead of an auto-generated id plus a separately-indexed `api_key` column.
Authenticating a request becomes a single `.doc(apiKey).get()` — cheaper and simpler than
Postgres's indexed `where api_key = ...` lookup, and it needed no index declaration at all. This
one came out ahead of the Postgres equivalent.

### No full-text search

`recall`'s "where are my keys" path used Postgres `textSearch` (websearch ranking) over
`raw_text`. Firestore has no equivalent. The replacement: fetch every item in the user's
subcollection and score them in-process by word overlap against `rawText`, in the Cloud Function
itself.

This is the clearest downside felt in practice: Postgres answered that query with one indexed
lookup; Firestore answers it by reading every item the person has, every time, and paying for
those reads regardless of whether any of them match. At hobby scale (dozens to low hundreds of
items per person) this is unmeasurable in cost or latency — but it stops scaling the moment either
number gets large, and there's no query-time knob to fix it short of introducing a real search
index (Algolia, Typesense) synced on every write. Deliberately not doing that here, to keep the
tradeoff visible rather than papered over.

### Alternatives considered

- **Keep Postgres, move only compute to Lambda** — would have captured the cost savings without
  giving up joins, cascades, or full-text search. Rejected only because the point of this pass was
  explicitly to spend time inside a document store's constraints, not to avoid them.
- **DynamoDB** instead of Firestore — similar tradeoffs (partition-key design, no joins), but no
  client SDK story for a future native iOS app the way Firestore has, and AWS Lambda + DynamoDB is
  more setup ceremony (IAM roles, API Gateway) for a single hobby project already living outside
  AWS.

## Consequences

- Project layout changed from CLI conventions in `supabase/` to `firebase/functions/src/`. See
  `SETUP.md` for the new local (emulator) and deploy workflow.
- `chrono-node`, `compromise`, and the Claude Haiku extraction call ported unchanged — none of
  them depended on the Deno runtime, only on being plain npm packages / `fetch`.
- The external contract (`x-app-key` header, JSON body, `{"speak": "..."}` response) is
  unchanged, so nothing about the planned Siri Shortcut, Alexa Skill, or setup web page needs to
  change shape — only the base URL, once this is actually deployed.
- Firestore security rules deny all direct client access (`firebase/firestore.rules`); only the
  Cloud Functions, via the Admin SDK, ever touch the database.
