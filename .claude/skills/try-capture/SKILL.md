---
name: try-capture
description: Dry-run a phrase through the reminders capture/recall pipeline and show what would be stored in Firestore and spoken back, with no emulator, database or Anthropic API key. Use when the user gives a phrase and wants to see how it would be classified (stash/person/todo) and stored. Triggers on "try capture", "what would this store", "test this phrase".
---

# try-capture

Shows what `capture` would store and what `recall` would say for a phrase. You play the
role of the Haiku extraction step, so it runs on the user's normal Claude usage, not the API.

The phrase to test is the skill argument. If none was given, ask for one.

## Steps

1. **Free path (regex fallback).** Run from the repo root:
   ```
   npm run try -- "<phrase>"
   ```
   This is what production does when no `ANTHROPIC_API_KEY` is set or the call fails.

2. **Claude path (you act as the model).** Get the exact prompt:
   ```
   npm run try -- --prompt
   ```
   Follow it literally on the phrase, replying with only the JSON object it asks for
   (`{"kind","thing","detail"}`). Do not improve on it: the point is to see what Haiku
   would do with these instructions. Then run:
   ```
   npm run try -- "<phrase>" --claude '<your JSON>'
   ```
   Escape single quotes inside the JSON as `'\''`.

3. **Report** both results compactly: kind, thing, detail, location/remindAt, and the capture
   and recall lines. Say where they differ, and where the free path got it wrong. Note that
   your JSON approximates Haiku, which is a smaller model.

Optional flags for either run: `--tz <IANA zone>` (default America/Los_Angeles), `--secret`.

Nothing is written anywhere. `remindAt` is resolved relative to now.
