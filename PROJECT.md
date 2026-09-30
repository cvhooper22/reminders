# Voice Memory System — Project Brief

## Goal
Capture things to remember (where I put something, or a reminder) by voice, hands-free,
with no app to open. Recall them later by asking a voice assistant. Multiple people should
be able to use the same system, each with their own private space.

## Platform landscape
- **Siri** — full capture + recall via iOS Shortcuts, no real compromises. Building this first.
- **Alexa** — full capture + recall via a custom Alexa Skill, but requires a spoken invocation
  name ("Alexa, ask [skill name] ..."). Planned for later.
- **Google Assistant** — dead end for recall. Google shut down custom conversational actions
  in 2023; there's no supported way to build "Hey Google, ask my system X" with a spoken
  answer back. At best, a Routine can fire a one-way webhook for capture only. Likely skipped
  or capture-only.

## Setup / distribution plan
- Distribute the Siri Shortcut via an iCloud share link from a simple web landing page.
- Use Apple's "Import Questions" feature so the backend URL and personal API key get filled
  in as part of the single "Add Shortcut" tap — no separate configuration step.
- The one unavoidable manual step: recording the "Hey Siri, ___" phrase. Apple requires the
  person say it themselves (tied to their voice), so this can't be automated or pre-filled.
- Longer-term option: a native iOS app using Apple's App Intents framework, where trigger
  phrases work automatically with zero "Add to Siri" step. Deferred for now — requires an
  Apple Developer account ($99/year) plus building and shipping an actual Swift app.

## Reminders
- Pull-based only for now: you ask ("what's today", "what's tomorrow"), it answers.
- No proactive push notifications yet. That would need a scheduled job (e.g. a Cloud
  Functions `onSchedule` trigger) plus a real notification channel (a Shortcut alone can't
  receive a push from the backend without something like ntfy.sh in between). Deferred by
  choice.

## Backend architecture
- Hosted on Firebase (free Spark tier): Firestore database + three Cloud Functions (Node/TypeScript).
- **signup** — creates a new person's account, returns their personal `api_key`.
- **capture** — takes dictated text, parses it, stores it, returns a spoken confirmation.
- **recall** — takes a spoken question, finds the best match (or reminder window), returns
  a spoken answer.
- Multi-user: every request needs an `x-app-key` header (that person's `api_key`); items
  live in a `users/{apiKey}/items` subcollection, so people only ever see their own items.
  See [docs/adr/0002-firestore-over-postgres.md](docs/adr/0002-firestore-over-postgres.md)
  for why Firestore was chosen over the original Postgres design, and the tradeoffs that
  came with it.

## Data model (Firestore)
- `users/{apiKey}` — one document per person, doc id *is* their `api_key` (so looking a
  person up is a single doc read, no query). Fields: `name`, `timezone`, `createdAt`.
- `users/{apiKey}/items/{itemId}` — one document per captured item:
  - `thing` — the bare item or task, e.g. "keys", "water", "call the dentist". Location and
    time phrases are stripped out of this on purpose.
  - `rawText` — the full original sentence, untouched. Kept as the source of truth and used
    for search (richer vocabulary to match against than the bare `thing`).
  - `location` — best-effort extracted, including its preposition ("under the bed"), nullable.
  - `remindAt` — parsed date/time (Firestore `Timestamp`), nullable. Interpreted in the
    person's `timezone` (set at signup), since Cloud Functions run in UTC.
  - `isSecret` — boolean, from a keyword check ("secret", "private", etc).
  - `extractedBy` — `'claude'` or `'free'`, records which method produced `thing`, useful
    for spot-checking quality later.

## How `thing` gets extracted
No AI dependency required by default:
- **chrono-node** (free library) parses the date/time phrase, if any.
- A preposition regex ("in", "on", "under", "at"...) extracts the location, if any.
- A keyword regex flags `is_secret`.
- **compromise.js** (free library) pulls the core noun phrase out of what's left for `thing`.

If `ANTHROPIC_API_KEY` is set as a Firebase secret, `capture` tries Claude Haiku first for
`thing` extraction (better on unusual phrasing), and automatically falls back to the free
method on any failure — missing key, network error, bad response. Fully optional; the system
runs at zero AI cost if the key is never set.

## Recall behavior
- **Reminder-style query** ("today", "tomorrow", "this week", "upcoming", "due", "reminders")
  → lists every item with a `remind_at` in that window, soonest first.
- **Everything else** → every item is fetched and scored by word overlap against `rawText`
  (Firestore has no built-in full-text search), best match wins, spoken back as
  "You put the [thing] [location]" (or just [thing] if there's no location).
- **Secret items** always get a deliberately vague spoken answer — "That's something you
  marked private, check your phone for the details" — never the real content. Reasoning:
  a spoken answer is audible to anyone in the room, so secret items should confirm they
  exist without ever saying what they are out loud.

## Files in this project
- `firebase/firestore.rules` — denies all direct client access; only the Admin SDK (used by
  Cloud Functions) touches Firestore.
- `firebase/functions/src/signup.ts` — the signup Cloud Function.
- `firebase/functions/src/capture.ts` — the capture Cloud Function.
- `firebase/functions/src/recall.ts` — the recall Cloud Function.
- `firebase/functions/src/shared/{auth,tz}.ts` — shared user-lookup and timezone helpers.
- `SETUP.md` — step-by-step deploy instructions and curl tests.

## Status
Backend code is written but **not yet deployed** to a live Firebase project. Next concrete
step is following `SETUP.md` to actually create the project and deploy the three functions.

## Next steps, roughly in order
1. Deploy the backend to Firebase; verify with the curl tests in `SETUP.md`.
2. Build the two iOS Shortcuts (capture and recall) that call these endpoints, using
   "Dictate Text" for voice input and "Get Contents of URL" to POST.
3. Build a simple landing/setup web page: calls `/signup`, shows the person their `api_key`,
   and links to a shareable Shortcut with import questions pre-wired for the backend URL
   and that key.
4. Later: an Alexa Skill with its own invocation name, hitting the same backend.
5. Later, optional: a native iOS app via App Intents, once it's worth paying for an Apple
   Developer account — gets rid of the last manual "Add to Siri" step entirely.

## Design principles to keep in mind
- **Minimize friction** — no opening an app to capture something; setup should take as few
  taps as possible.
- **Minimize AI dependency** — deterministic parsing is the default path; AI is an optional
  quality upgrade with automatic fallback, never a hard requirement.
- **Privacy first** — secret items never have their real content spoken aloud, regardless
  of which assistant or device is asking.
