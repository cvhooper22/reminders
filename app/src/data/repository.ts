import type { Item } from '../types';

/**
 * Everything the UI needs from a backend. Screens only talk to this interface, so
 * swapping the mock for the Firebase backend is a one-line change in App.tsx.
 *
 * Secret items come back redacted (placeholder text) until `unlock` succeeds;
 * after that `list()` returns them in full, until `lock()` is called.
 */
export interface ItemsRepository {
  list(): Promise<Item[]>;
  capture(rawText: string, opts?: { secret?: boolean }): Promise<Item>;
  remove(id: string): Promise<void>;
  /** Fix a label (`thing`) and its "where" line (location for stashes, else detail). */
  update(id: string, fields: { thing: string; where: string | null }): Promise<Item>;
  /** Mark a private item unread (flagged) or read (cleared). */
  setUnread(id: string, unread: boolean): Promise<void>;
  /** Resolves true if the PIN is right; the repository then reveals secrets. */
  unlock(pin: string): Promise<boolean>;
  lock(): void;
  /** A short-lived 6-digit code to say to Alexa ("tell junk drawer to link 123456"). */
  alexaLinkCode(): Promise<{ code: string; expiresInMinutes: number }>;
}
