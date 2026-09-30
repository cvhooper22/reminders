import type { Timestamp } from "firebase-admin/firestore";

export interface ItemJson {
  id: string;
  kind: string;
  thing: string;
  rawText: string;
  location: string | null;
  detail: string | null;
  remindAt: string | null;
  isSecret: boolean;
  createdAt: string;
  unread: boolean;
  lastAskedAt: string | null;
}

const iso = (t: Timestamp | undefined | null): string | null => (t ? t.toDate().toISOString() : null);

/**
 * Wire format for an item. Secret items are redacted unless `reveal` is true, so the
 * real text never leaves the server without the tin PIN.
 */
export function serializeItem(
  id: string,
  data: FirebaseFirestore.DocumentData,
  reveal: boolean
): ItemJson {
  const hide = !!data.isSecret && !reveal;
  return {
    id,
    kind: data.kind ?? (data.remindAt ? "todo" : "stash"),
    thing: hide ? "private thing" : data.thing,
    rawText: hide ? "" : data.rawText,
    location: hide ? null : data.location ?? null,
    detail: hide ? null : data.detail ?? null,
    remindAt: hide ? null : iso(data.remindAt),
    isSecret: !!data.isSecret,
    createdAt: iso(data.createdAt) ?? new Date().toISOString(),
    // Not redacted: knowing a private item was asked about reveals nothing about its content.
    unread: !!data.unread,
    lastAskedAt: iso(data.lastAskedAt),
  };
}
