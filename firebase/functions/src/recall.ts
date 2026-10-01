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
import { getUserFromRequest } from "./shared/auth";
import { startOfLocalDay } from "./shared/tz";

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

function isReminderQuery(query: string): boolean {
  return /\b(today|tomorrow|this week|upcoming|due|reminders?)\b/i.test(query);
}

// Day boundaries are the person's local midnights, not the server's (UTC).
function reminderWindow(query: string, timeZone: string): { start: Date; end: Date } {
  const now = new Date();
  const endOfDay = (daysAhead: number) =>
    new Date(startOfLocalDay(now, timeZone, daysAhead + 1).getTime() - 1);
  if (/tomorrow/i.test(query)) {
    return { start: startOfLocalDay(now, timeZone, 1), end: endOfDay(1) };
  }
  if (/this week/i.test(query)) {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return { start: now, end };
  }
  return { start: now, end: endOfDay(0) };
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

  const itemsRef = db.collection("users").doc(user.apiKey).collection("items");

  if (isReminderQuery(query)) {
    const { start, end } = reminderWindow(query, user.timezone);

    let snap;
    try {
      snap = await itemsRef
        .where("remindAt", ">=", Timestamp.fromDate(start))
        .where("remindAt", "<=", Timestamp.fromDate(end))
        .orderBy("remindAt", "asc")
        .get();
    } catch {
      res.status(500).json({ speak: "I couldn't reach your saved items." });
      return;
    }

    if (snap.empty) {
      res.json({ speak: "Nothing on your list for that." });
      return;
    }

    const parts = snap.docs.map((doc) =>
      doc.data().isSecret ? "something you marked private" : doc.data().thing
    );
    const originals = snap.docs.filter((d) => !d.data().isSecret).map((d) => d.data().rawText);
    const speak = `You have ${parts.length} thing${parts.length > 1 ? "s" : ""}: ${parts.join(", ")}.`;
    res.json({ speak, originals });
    return;
  }

  let snap;
  try {
    snap = await itemsRef.get();
  } catch {
    res.status(500).json({ speak: "I couldn't reach your saved items." });
    return;
  }

  const items = snap.docs.map((doc) => doc.data() as Item);
  const bestIdx = bestMatchIndex(query, items);

  if (bestIdx === -1) {
    res.json({ speak: "I couldn't find anything about that." });
    return;
  }

  const best = items[bestIdx];
  if (best.isSecret) {
    // Stays flagged until the person marks it read in the app. Best-effort: a failed
    // write shouldn't block the spoken answer.
    await snap.docs[bestIdx].ref
      .update({ unread: true, lastAskedAt: FieldValue.serverTimestamp() })
      .catch(() => undefined);
    res.json({ speak: "That's something you marked private. Check your phone for the details." });
    return;
  }

  // "original" is always returned so the client can offer "read me the original".
  res.json({ speak: speakItem(best), original: best.rawText });
});
