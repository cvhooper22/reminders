// Cloud Function: capture
//
// "thing" is the bare item or task -- location and time stripped out.
// If ANTHROPIC_API_KEY is set as a secret, Claude does this extraction (better on
// unusual phrasing). If it's not set, or the call fails for any reason, a free,
// local heuristic (compromise.js) does it instead -- zero cost, zero network call,
// never fails. "rawText" always keeps the untouched original sentence either way.

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import * as chrono from "chrono-node";
import nlp from "compromise";
import { db } from "./admin";
import { getUserFromRequest } from "./shared/auth";
import { tzOffsetMinutes } from "./shared/tz";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const SECRET_PATTERN = /\b(secret|private|confidential|don'?t tell)\b/i;
// The preposition is kept as part of the location ("under the bed", "in the hall closet")
// so recall can say it back as-is instead of assuming "in the".
const LOCATION_PATTERN = /\b((?:in|on|under|inside|at|by|near|behind|beside|beneath)\s+.+?)[.!]?$/i;
const FILLER_PATTERN =
  /^(i put|i placed|i left|i stored|i hid|remind me to|remember to|don'?t forget to|note that|i need to)\s*/i;
const ARTICLE_PATTERN = /^(the|a|an|my|some|your|his|her|their)\s+/i;

function extractLocation(text: string): { location: string | null; withoutLocation: string } {
  const match = text.match(LOCATION_PATTERN);
  if (!match || match.index === undefined) {
    return { location: null, withoutLocation: text };
  }
  const location = match[1].trim() || null;
  const withoutLocation = (
    text.slice(0, match.index) + text.slice(match.index + match[0].length)
  ).trim();
  return { location, withoutLocation };
}

function extractRemindAt(
  text: string,
  timeZone: string
): { remindAt: Date | null; withoutDate: string } {
  const now = new Date();
  const results = chrono.parse(text, { instant: now, timezone: tzOffsetMinutes(timeZone, now) });
  if (results.length === 0) return { remindAt: null, withoutDate: text };
  const hit = results[0];
  const withoutDate = (
    text.slice(0, hit.index) + text.slice(hit.index + hit.text.length)
  ).trim();
  return { remindAt: hit.start.date(), withoutDate };
}

function extractThingFree(withoutDateAndLocation: string, fullText: string): string {
  const doc = nlp(withoutDateAndLocation);
  const nouns = doc.nouns().out("array") as string[];
  if (nouns.length > 0) {
    const candidate = nouns[nouns.length - 1].replace(ARTICLE_PATTERN, "").trim();
    if (candidate) return candidate;
  }
  const fallback = withoutDateAndLocation
    .replace(FILLER_PATTERN, "")
    .replace(ARTICLE_PATTERN, "")
    .trim();
  return fallback || fullText.trim();
}

async function extractThingClaude(text: string): Promise<string | null> {
  const apiKey = ANTHROPIC_API_KEY.value();
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        system:
          "Extract only the bare item or task being remembered, stripped of any location or " +
          "time phrase. Respond with just that word or short phrase -- nothing else, no " +
          'punctuation. Examples: "I put the keys in the hall closet" -> keys. ' +
          '"Remind me to turn off the water" -> water. ' +
          '"Don\'t forget to call the dentist tomorrow" -> call the dentist.',
        messages: [{ role: "user", content: text }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { text?: string }[] };
    const out = data.content?.[0]?.text?.trim();
    return out || null;
  } catch {
    return null;
  }
}

export const capture = onRequest({ secrets: [ANTHROPIC_API_KEY] }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }

  const { text } = req.body ?? {};
  if (!text || typeof text !== "string") {
    res.status(400).send("missing text");
    return;
  }

  const isSecret = SECRET_PATTERN.test(text);
  const { remindAt, withoutDate } = extractRemindAt(text, user.timezone);
  const { location, withoutLocation } = extractLocation(withoutDate);

  let thing = await extractThingClaude(text);
  let extractedBy = "claude";
  if (!thing) {
    thing = extractThingFree(withoutLocation, text);
    extractedBy = "free";
  }

  try {
    await db
      .collection("users")
      .doc(user.apiKey)
      .collection("items")
      .add({
        thing,
        rawText: text,
        location,
        remindAt: remindAt ? Timestamp.fromDate(remindAt) : null,
        isSecret,
        extractedBy,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch {
    res.status(500).json({ speak: "Sorry, something went wrong saving that." });
    return;
  }

  const speak = isSecret ? "Got it. Saved as private." : `Got it, noted: ${thing}.`;
  res.json({ speak });
});
