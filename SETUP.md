# Backend setup (Firebase, multi-user)

## Project layout
```
firebase/
  firebase.json             -- emulator + functions config
  .firebaserc               -- your project alias (fill in after creating a Firebase project)
  firestore.rules            -- denies all direct client access; only Cloud Functions touch Firestore
  firestore.indexes.json     -- composite indexes (empty for now -- see "Data model" in PROJECT.md)
  functions/
    package.json
    src/
      index.ts               -- exports signup, capture, recall
      signup.ts
      capture.ts
      recall.ts
      shared/tz.ts
      shared/auth.ts
docs/adr/                    -- architecture decision records
```

The Firebase CLI is a project dev dependency, so run it with `npx firebase ...` from the repo
root, or install functions' own deps first:
```
npm install
npm --prefix firebase/functions install
```

## Local development (recommended first)
Requires a Java runtime (the Firestore emulator is a Java process). Check with `java -version`;
if that fails, install one (e.g. `brew install openjdk` on a Mac with Homebrew, or download a JRE
from https://adoptium.net).

```
cd firebase
npx firebase emulators:start --project demo-reminders --only functions,firestore
```
Using a `demo-`-prefixed project id runs everything in full offline mode -- no real Firebase
project, no billing, no `firebase login` needed. Swap in your real project id later once you're
ready to deploy.

Local endpoints (ports come from `firebase.json`):
```
http://127.0.0.1:5002/demo-reminders/us-central1/signup
http://127.0.0.1:5002/demo-reminders/us-central1/capture
http://127.0.0.1:5002/demo-reminders/us-central1/recall
```
The Emulator UI (Firestore data browser, function logs) is at `http://127.0.0.1:4000`.

Functions rebuild on save if you run `npm --prefix firebase/functions run build:watch` in a
second terminal alongside the emulator.

**Optional Anthropic key locally:** create `firebase/functions/.secret.local` (gitignored) with
`ANTHROPIC_API_KEY=sk-ant-...` -- the emulator reads secrets from that file automatically.

**Reaching it from an iPhone:** `127.0.0.1` only works on the Mac itself. On the same Wi-Fi, use
the Mac's LAN IP instead. Away from home you need a tunnel (Tailscale, ngrok), and the Mac has to
be awake.

## End-to-end local testing (app + emulator)
Needs Java (see above). From the repo root, in separate terminals:
```
npm install && npm --prefix firebase/functions install && npm --prefix app install
npm run backend     # builds functions, starts the Firestore + Functions emulators
npm run seed        # dev user "dev-local-key" (tin PIN 1234) + 11 sample items
npm run e2e         # API test suite: signup, capture, list, PIN/redaction, recall, delete
npm run app         # web app; app/.env.local points it at the emulator
```
`npm run seed` is safe to re-run; it resets the dev user's items. `npm run e2e` creates its own
throwaway users, so it never touches seeded data. Delete `app/.env.local` (or unset the two
variables) to run the app against in-memory mock data instead.

The app's extra endpoints, all `POST` with `x-app-key`:
- `items` -> `{items: [...]}`, newest first. Secret items come back redacted
  (`thing: "private thing"`, empty text) unless the `x-tin-pin` header carries the right PIN.
- `removeItem` `{id}` -> `{ok: true}`. Deleting a secret item also needs `x-tin-pin`.
- `unlock` `{pin}` -> `{ok: true}` (200) or `{ok: false}` (401).
- `capture` also accepts `"secret": true` and now returns the saved `item` alongside `speak`.
- `signup` also accepts an optional 4-digit `pin` for the tin.

## Deploying to hosted Firebase

### 1. Create the project
- Go to console.firebase.google.com, create a free project (Spark plan is fine).
- Enable Firestore (Native mode, pick any region) from the console.

### 2. Link and set secrets
```
npx firebase login
```
Edit `firebase/.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID` with your real project id.

### 3. (Optional) Anthropic key for better extraction
Entirely optional. Without it, a free local library (compromise.js) extracts the bare item. It
works well for straightforward phrasing, with no cost and no network dependency. With a key,
Claude does the extraction instead (it handles unusual phrasing better) and automatically falls
back to the free method if the call ever fails.

If you want it: get a key at console.anthropic.com, then:
```
npx firebase functions:secrets:set ANTHROPIC_API_KEY
```
(it'll prompt for the value -- paste it and press enter).

### 4. Deploy
From the `firebase/` directory:
```
cd firebase
npx firebase deploy --only functions,firestore:rules
```
This builds the functions (via the `predeploy` hook in `firebase.json`) and deploys all three,
plus the Firestore security rules that deny all direct client access.

### 5. Your endpoints
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/signup
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/capture
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/recall
```
(Region may differ if you picked something other than `us-central1` for Firestore.)

## How a new person joins
1. They call `/signup` once (this is what the setup web page will do automatically):
   ```
   curl -X POST $BASE/signup \
     -H "content-type: application/json" \
     -d '{"name": "Alice", "timezone": "America/Los_Angeles"}'
   ```
   Response: `{"api_key": "a1b2c3..."}`

   `timezone` is an IANA name. It's what makes "tomorrow at 9am" and "what's today" mean their
   local day, since the functions run in UTC. It's optional (defaults to `UTC`), but leaving it
   out puts reminders off by the UTC offset. An unrecognized name returns 400. The setup page can
   read it from the browser with `Intl.DateTimeFormat().resolvedOptions().timeZone`.
2. That `api_key` is theirs, permanently. It gets pasted once into their Shortcut's import
   question. It also doubles as their Firestore document id (`users/{apiKey}`), so looking a
   person up is a single document read -- no query needed.
3. Every `capture` and `recall` call looks up the user from that key and only touches items in
   their own `users/{apiKey}/items` subcollection.

## Requests
Every call to `capture` or `recall` needs:
- Header: `x-app-key: <that person's api_key>`
- Header: `content-type: application/json`
- Body for capture: `{"text": "whatever you dictated"}`
- Body for recall: `{"query": "whatever you asked"}`

Both return `{"speak": "..."}`.

## What recall understands
- A location/item question ("where's my passport") -> every item is fetched and scored by
  word overlap against the original sentence, best match wins, spoken back as "you put the
  [thing] [location]" (vague if marked secret). Firestore has no built-in full-text search like
  Postgres did, so this trades an index for reading every item -- fine at hobby scale.
- A reminder-style question ("what's today", "what's tomorrow", "what's this week",
  "what's coming up") -> lists every `thing` with a `remindAt` in that window, soonest first.

## Test it
Set `BASE` to either the local or hosted endpoint root:
```
BASE=http://127.0.0.1:5002/demo-reminders/us-central1
# or: BASE=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net
```

```
# 1. Create yourself an account
curl -X POST $BASE/signup \
  -H "content-type: application/json" \
  -d '{"name": "You", "timezone": "America/Los_Angeles"}'
# -> save the api_key from the response, use it below

# 2. Capture a location note
curl -X POST $BASE/capture \
  -H "x-app-key: YOUR_API_KEY" \
  -H "content-type: application/json" \
  -d '{"text": "I put the keys in the hall closet"}'

# 3. Capture a reminder
curl -X POST $BASE/capture \
  -H "x-app-key: YOUR_API_KEY" \
  -H "content-type: application/json" \
  -d '{"text": "remind me to turn off the water tomorrow at 9am"}'

# 4. Recall the location note
curl -X POST $BASE/recall \
  -H "x-app-key: YOUR_API_KEY" \
  -H "content-type: application/json" \
  -d '{"query": "where are my keys"}'

# 5. Recall tomorrow's reminders
curl -X POST $BASE/recall \
  -H "x-app-key: YOUR_API_KEY" \
  -H "content-type: application/json" \
  -d '{"query": "what do I have tomorrow"}'
```

## Note for later
When we build the setup web page, it'll call `/signup` for each new person and show them their
`api_key` to copy into their Shortcut's import question, so nobody ever touches the Firebase
console directly.
