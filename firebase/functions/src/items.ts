// Cloud Functions for the app UI: list items, delete an item, unlock the tin.
//
// Secret items are always returned redacted unless the request carries the correct
// tin PIN in the `x-tin-pin` header (see shared/pin.ts).

import { onRequest } from "firebase-functions/v2/https";
import { db } from "./admin";
import { getUserFromRequest } from "./shared/auth";
import { checkPin, hasTinAccess, isValidPin } from "./shared/pin";
import { serializeItem } from "./shared/serialize";

export const items = onRequest({ cors: true }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }

  const snap = await db
    .collection("users")
    .doc(user.apiKey)
    .collection("items")
    .orderBy("createdAt", "desc")
    .get();

  const reveal = hasTinAccess(req, user);
  res.json({ items: snap.docs.map((d) => serializeItem(d.id, d.data(), reveal)) });
});

export const removeItem = onRequest({ cors: true }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }

  const { id } = req.body ?? {};
  if (!id || typeof id !== "string") {
    res.status(400).send("missing id");
    return;
  }

  const ref = db.collection("users").doc(user.apiKey).collection("items").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).send("not found");
    return;
  }
  if (snap.data()!.isSecret && !hasTinAccess(req, user)) {
    res.status(403).send("locked");
    return;
  }

  await ref.delete();
  res.json({ ok: true });
});

// Fix a mis-captured item. `thing` is the label; `where` is the kind-specific line shown
// under it (a stash's location, otherwise the detail). rawText stays the untouched original;
// `edited` tells recall to match on these corrected fields instead of the stale sentence.
export const updateItem = onRequest({ cors: true }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }

  const { id, thing, where } = req.body ?? {};
  const newThing = typeof thing === "string" ? thing.trim() : "";
  if (!id || typeof id !== "string" || !newThing || (where != null && typeof where !== "string")) {
    res.status(400).send("missing id or thing");
    return;
  }

  const ref = db.collection("users").doc(user.apiKey).collection("items").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).send("not found");
    return;
  }
  const data = snap.data()!;
  if (data.isSecret && !hasTinAccess(req, user)) {
    res.status(403).send("locked");
    return;
  }

  const newWhere = typeof where === "string" ? where.trim() || null : null;
  const kind = data.kind ?? (data.remindAt ? "todo" : "stash");
  await ref.update({
    thing: newThing,
    edited: true,
    ...(kind === "stash" ? { location: newWhere } : { detail: newWhere }),
  });
  res.json({ item: serializeItem(id, (await ref.get()).data()!, true) });
});

// Recall flags a private item `unread` when it's asked for by voice; it stays flagged
// until the person clears it here. No PIN needed: the flag reveals nothing about content.
export const setUnread = onRequest({ cors: true }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }

  const { id, unread } = req.body ?? {};
  if (!id || typeof id !== "string" || typeof unread !== "boolean") {
    res.status(400).send("missing id or unread");
    return;
  }

  const ref = db.collection("users").doc(user.apiKey).collection("items").doc(id);
  if (!(await ref.get()).exists) {
    res.status(404).send("not found");
    return;
  }

  await ref.update({ unread });
  res.json({ ok: true });
});

export const unlock = onRequest({ cors: true }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }
  if (!user.pinHash) {
    res.status(404).json({ ok: false, error: "no pin set" });
    return;
  }

  const { pin } = req.body ?? {};
  const ok = isValidPin(pin) && checkPin(pin, user.pinHash);
  res.status(ok ? 200 : 401).json({ ok });
});
