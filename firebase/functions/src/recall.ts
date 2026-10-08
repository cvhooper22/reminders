// Cloud Function: recall
//
// No AI call. Firestore has no full-text search like Postgres's `textSearch`, so the
// location/item question path fetches the user's items and scores them in-process by
// word overlap against "rawText" (the full original sentence -- most vocabulary to
// match against), then speaks back using the bare "thing" plus "location". This reads
// every item every time -- fine at hobby scale, but it's the direct cost of not having
// an indexed search: you pay in read-ops what Postgres gave you in an index.

import { onRequest } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";
import { getUserFromRequest, type AuthedUser } from "./shared/auth";
import { startOfLocalDay, tzOffsetMinutes } from "./shared/tz";

interface Item {
  kind?: string;
  thing: string;
  rawText: string;
  location: string | null;
  detail?: string | null;
  isSecret: boolean;
  /** Set once the person corrects the item in the app; rawText is then out of date. */
  edited?: boolean;
}

// How each kind is said back. Add a kind -> add a line here.
export function speakItem(item: Item): string {
  if (item.kind === "person") return item.detail ? `${item.thing}: ${item.detail}.` : `${item.thing}.`;
  if (item.kind === "todo") return `${item.thing}${item.detail ? `, ${item.detail}` : ""}.`;
  return item.location ? `You put the ${item.thing} ${item.location}.` : `${item.thing}.`;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_PATTERN = new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`, "i");

type Window = { start: Date; end: Date };

// The span of time a question is about ("next week", "friday", "today"), or null when it
// names none. Boundaries are the person's local midnights, not the server's (UTC); weeks run
// Monday to Sunday. Spans are [start, end] with end being the last millisecond.
function namedPeriod(query: string, timeZone: string, now: Date): Window | null {
  const dayStart = (daysAhead: number) => startOfLocalDay(now, timeZone, daysAhead);
  const span = (from: number, toExclusive: number): Window => ({
    start: dayStart(from),
    end: new Date(dayStart(toExclusive).getTime() - 1),
  });
  // Day-of-month arithmetic runs on the local date, then maps back to whole-day offsets.
  const local = new Date(now.getTime() + tzOffsetMinutes(timeZone, now) * 60000);
  const dow = local.getUTCDay();
  const daysToMonth = (monthsAhead: number) =>
    Math.round(
      (Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + monthsAhead, 1) -
        Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())) /
        86400000
    );
  const nextMonday = 7 - ((dow + 6) % 7);

  if (/\bnext week\b/i.test(query)) return span(nextMonday, nextMonday + 7);
  if (/\bthis week\b/i.test(query)) return span(0, nextMonday);
  if (/\bweekend\b/i.test(query)) {
    const saturday = dow === 0 ? -1 : 6 - dow;
    return span(saturday, saturday + 2);
  }
  if (/\bnext month\b/i.test(query)) return span(daysToMonth(1), daysToMonth(2));
  if (/\bthis month\b/i.test(query)) return span(0, daysToMonth(1));
  if (/\btomorrow\b/i.test(query)) return span(1, 2);
  if (/\b(today|tonight)\b/i.test(query)) return span(0, 1);
  const weekday = query.match(WEEKDAY_PATTERN);
  if (weekday) {
    const ahead = (WEEKDAYS.indexOf(weekday[1].toLowerCase()) - dow + 7) % 7;
    return span(ahead, ahead + 1);
  }
  return null;
}

// "before next week" -> everything from today up to the end of this week.
// "by friday" -> through the end of Friday. A bare period ("today", "next week") is that span.
// null when the question names no time at all.
export function reminderWindow(query: string, timeZone: string, now = new Date()): Window | null {
  const period = namedPeriod(query, timeZone, now);
  if (!period) return null;
  const todayStart = startOfLocalDay(now, timeZone, 0);
  if (/\bbefore\b/i.test(query)) {
    return { start: todayStart, end: new Date(period.start.getTime() - 1) };
  }
  if (/\b(by|until|till|through)\b/i.test(query)) {
    return { start: todayStart, end: period.end };
  }
  return period;
}

// A time phrase, or a plain ask for the list ("what's due", "my reminders") which means today.
function reminderQueryWindow(query: string, timeZone: string): Window | null {
  const window = reminderWindow(query, timeZone);
  if (window) return window;
  if (!/\b(upcoming|due|reminders?)\b/i.test(query)) return null;
  const now = new Date();
  return { start: startOfLocalDay(now, timeZone, 0), end: new Date(startOfLocalDay(now, timeZone, 1).getTime() - 1) };
}

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "i", "my", "me", "you", "your",
  "where", "what", "who", "whos", "who's", "do", "does", "did", "put", "place", "placed", "have", "has",
  "had", "in", "on", "at", "to", "of", "for", "with", "this", "that", "it", "and", "or",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word));
}

// What a query is matched against. The original sentence has the most vocabulary, but once
// an item has been edited it describes the old (wrong) version, so only the fields count.
export function searchText(item: Item): string {
  const fields = [item.thing, item.location, item.detail].filter(Boolean).join(" ");
  return item.edited ? fields : `${item.rawText} ${fields}`;
}

// Highest word-overlap with `query` wins; -1 if nothing overlaps at all.
function bestMatchIndex(query: string, items: Item[]): number {
  const queryWords = new Set(tokenize(query));
  if (queryWords.size === 0) return -1;

  let bestIdx = -1;
  let bestScore = 0;
  items.forEach((item, idx) => {
    const itemWords = new Set(tokenize(searchText(item)));
    let score = 0;
    for (const word of queryWords) if (itemWords.has(word)) score++;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

export type RecallResult = { speak: string; originals?: string[]; original?: string };

// Answer one spoken question. Shared by the HTTP endpoint and the Alexa skill.
export async function answerRecall(user: AuthedUser, query: string): Promise<RecallResult> {
  const itemsRef = db.collection("users").doc(user.apiKey).collection("items");

  const window = reminderQueryWindow(query, user.timezone);
  if (window) {
    const { start, end } = window;

    let snap;
    try {
      snap = await itemsRef
        .where("remindAt", ">=", Timestamp.fromDate(start))
        .where("remindAt", "<=", Timestamp.fromDate(end))
        .orderBy("remindAt", "asc")
        .get();
    } catch {
      return { speak: "I couldn't reach your saved items." };
    }

    if (snap.empty) return { speak: "Nothing on your list for that." };

    const parts = snap.docs.map((doc) =>
      doc.data().isSecret ? "something you marked private" : doc.data().thing
    );
    const originals = snap.docs.filter((d) => !d.data().isSecret).map((d) => d.data().rawText);
    const speak = `You have ${parts.length} thing${parts.length > 1 ? "s" : ""}: ${parts.join(", ")}.`;
    return { speak, originals };
  }

  let snap;
  try {
    snap = await itemsRef.get();
  } catch {
    return { speak: "I couldn't reach your saved items." };
  }

  const items = snap.docs.map((doc) => doc.data() as Item);
  const bestIdx = bestMatchIndex(query, items);
  if (bestIdx === -1) return { speak: "I couldn't find anything about that." };

  const best = items[bestIdx];
  if (best.isSecret) {
    // Stays flagged until the person marks it read in the app. Best-effort: a failed
    // write shouldn't block the spoken answer.
    await snap.docs[bestIdx].ref
      .update({ unread: true, lastAskedAt: FieldValue.serverTimestamp() })
      .catch(() => undefined);
    return { speak: "That's something you marked private. Check your phone for the details." };
  }

  // "original" is always returned so the client can offer "read me the original".
  return { speak: speakItem(best), original: best.rawText };
}

export const recall = onRequest({ cors: true }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }

  const { query } = req.body ?? {};
  if (!query || typeof query !== "string") {
    res.status(400).send("missing query");
    return;
  }

  res.json(await answerRecall(user, query));
});
