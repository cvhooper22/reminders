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
import { serializeItem } from "./shared/serialize";
import { tzOffsetMinutes } from "./shared/tz";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// Every item has a kind. Common fields (thing, rawText, isSecret, createdAt) are shared;
// `detail` is the kind-specific text: stash -> location, person -> how you know them,
// todo -> the reason/context. Relationships between people live in rawText, which recall
// always offers back. To add a kind: extend KINDS, the Claude prompt, the fallback
// classifier below, and the speak template in recall.ts.
const KINDS = ["stash", "person", "todo"] as const;
type Kind = (typeof KINDS)[number];

const PERSON_PATTERN =
  /\b(friend|mom|dad|mother|father|parents?|kid|son|daughter|teacher|neighbou?r|coach|nanny|babysitter)\b/i;
const NAME_PATTERN = /\b[A-Z][a-z]+\b/;
const TODO_PATTERN = /^(remind me|remember to|don'?t forget|i need to|need to)\b/i;

function classifyFree(text: string, hasDate: boolean): Kind {
  if (TODO_PATTERN.test(text) || hasDate) return "todo";
  if (PERSON_PATTERN.test(text) && NAME_PATTERN.test(text)) return "person";
  return "stash";
}

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

function extractThingFree(withoutDateAndLocation: string, fullText: string, kind?: Kind): string {
  // For todos, preserve the verb after the filler (e.g., "sign" in "i need to sign").
  if (kind === "todo") {
    let withoutFiller = withoutDateAndLocation.replace(FILLER_PATTERN, "").trim();
    // Remove date prepositions that chrono may have left behind (e.g., "before" in "before tomorrow").
    withoutFiller = withoutFiller.replace(/\s+(by|before|after)\b/i, "").trim();
    if (withoutFiller) return withoutFiller;
  }
  // For stash and person, extract nouns.
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

export type Extracted = { kind: Kind; thing: string; detail: string | null };

// Exported so scripts/try-capture and the /try-capture skill use the exact same prompt.
export const CLASSIFY_PROMPT =
          "Classify a note someone wants to remember and extract fields. Respond with only a " +
          'JSON object: {"kind","thing","detail"}. kind is one of: "stash" (an item put ' +
          'somewhere; thing=the item, detail=where, keeping its preposition), "person" ' +
          "(someone's name to remember; thing=the person's name, detail=how they're connected, " +
          'e.g. "Ella\'s friend"), "todo" (something to do; thing=the task without any time ' +
          'phrase, detail=the reason or null). detail is null when absent. Examples: ' +
          '"I put the keys in the hall closet" -> {"kind":"stash","thing":"keys","detail":"in the hall closet"}. ' +
          '"Sam is Ella\'s friend from soccer" -> {"kind":"person","thing":"Sam","detail":"Ella\'s friend from soccer"}. ' +
          '"Remind me to call the dentist tomorrow, it\'s the cleaning" -> {"kind":"todo","thing":"call the dentist","detail":"the cleaning"}.';

// Model reply text -> a validated extraction, or null if it isn't usable.
export function parseExtraction(raw: string | undefined): Extracted | null {
  try {
    const json = raw?.trim().match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    const parsed = JSON.parse(json) as Partial<Extracted>;
    if (!parsed.thing || !KINDS.includes(parsed.kind as Kind)) return null;
    return {
      kind: parsed.kind as Kind,
      thing: String(parsed.thing).trim(),
      detail: parsed.detail ? String(parsed.detail).trim() : null,
    };
  } catch {
    return null;
  }
}

async function extractClaude(text: string): Promise<Extracted | null> {
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
        max_tokens: 150,
        system: CLASSIFY_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { text?: string }[] };
    return parseExtraction(data.content?.[0]?.text);
  } catch {
    return null;
  }
}

// First capitalized word is the name; whatever follows ("is Ella's friend from soccer",
// ", the coach") is how you know them.
// "Logan's parents names are Tim and Tonya" -> the names come after the relation.
const RELATION_FIRST_PATTERN =
  /^\s*(\w+)'s\s+((?:\w+\s+)*?(?:parents?|friends?|mom|dad|mother|father|kids?|son|daughter|teacher|neighbou?rs?|coach|nanny|babysitter))(?:'?s?\s+names?)?\s+(?:is|are|was|were)\s+(.+?)[.!\s]*$/i;

function extractPersonFree(text: string): Extracted {
  const relation = text.match(RELATION_FIRST_PATTERN);
  if (relation) {
    const owner = relation[1].charAt(0).toUpperCase() + relation[1].slice(1);
    return { kind: "person", thing: relation[3], detail: `${owner}'s ${relation[2]}` };
  }
  const match = text.match(NAME_PATTERN);
  if (!match || match.index === undefined) return { kind: "person", thing: text.trim(), detail: null };
  const rest = text
    .slice(match.index + match[0].length)
    .replace(/^[\s,:-]*(is|was|=)?\s*/i, "")
    .replace(/[.!\s]+$/, "")
    .trim();
  return { kind: "person", thing: match[0], detail: rest || null };
}

// Everything capture decides about a sentence, minus I/O. `claude` is the model's
// extraction (null = unavailable, use the free heuristic). Pure so it can be run locally
// from scripts/try-capture.js with a hand-supplied `claude` value.
export function analyze(text: string, timeZone: string, claude: Extracted | null) {
  const dated = extractRemindAt(text, timeZone);
  const located = extractLocation(dated.withoutDate);

  let extracted = claude;
  let extractedBy = "claude";
  if (!extracted) {
    const kind = classifyFree(text, dated.remindAt !== null);
    extracted =
      kind === "person"
        ? extractPersonFree(text)
        : {
            kind,
            thing: extractThingFree(located.withoutLocation, text, kind),
            detail: kind === "stash" ? located.location : null,
          };
    extractedBy = "free";
  }
  const { kind, thing, detail } = extracted;
  // Dates only mean something on a todo; locations only on a stash.
  const remindAt = kind === "todo" ? dated.remindAt : null;
  const location = kind === "stash" ? detail ?? located.location : null;
  return { kind, thing, detail, remindAt, location, extractedBy };
}

export const capture = onRequest({ cors: true, secrets: [ANTHROPIC_API_KEY] }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }

  const { text, secret } = req.body ?? {};
  if (!text || typeof text !== "string") {
    res.status(400).send("missing text");
    return;
  }

  const isSecret = secret === true || SECRET_PATTERN.test(text);
  const { kind, thing, detail, remindAt, location, extractedBy } = analyze(
    text,
    user.timezone,
    await extractClaude(text)
  );

  let saved;
  try {
    const ref = await db
      .collection("users")
      .doc(user.apiKey)
      .collection("items")
      .add({
        kind,
        thing,
        rawText: text,
        location,
        detail: kind === "stash" ? null : detail,
        remindAt: remindAt ? Timestamp.fromDate(remindAt) : null,
        isSecret,
        extractedBy,
        createdAt: FieldValue.serverTimestamp(),
      });
    saved = serializeItem(ref.id, (await ref.get()).data()!, true);
  } catch {
    res.status(500).json({ speak: "Sorry, something went wrong saving that." });
    return;
  }

  const speak = isSecret
    ? "Got it. Saved as private."
    : kind === "person"
    ? `Got it, ${thing}${detail ? `: ${detail}` : ""}.`
    : `Got it, noted: ${thing}.`;
  res.json({ speak, item: saved });
});
