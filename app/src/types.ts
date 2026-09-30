// Mirrors the Firestore `users/{apiKey}/items/{id}` document (see PROJECT.md),
// plus `color`, a purely client-side flourish for the label-maker tape.

export type TagColor = 'blue' | 'yellow' | 'black' | 'red' | 'green';

export type Item = {
  id: string;
  /** Missing on older items; treat as 'stash' (or 'todo' when remindAt is set). */
  kind?: Kind;
  /** Bare item or task: "keys", "call the dentist". */
  thing: string;
  /** Full original sentence; used for search. */
  rawText: string;
  /** Best-effort, includes its preposition: "under the bed". */
  location: string | null;
  /** Kind-specific text: how you know a person, the reason for a todo. */
  detail?: string | null;
  remindAt: Date | null;
  /** Secret items live in the locked tin and are never shown/spoken in the clear. */
  isSecret: boolean;
  /** Set when a voice client asked for this private item; stays until marked read. */
  unread?: boolean;
  lastAskedAt?: Date | null;
  createdAt: Date;
  color?: TagColor;
};

/** What the note is: an item put somewhere, a person to remember, or something to do. */
export type Kind = 'stash' | 'person' | 'todo';

export type Filter = 'all' | 'fresh' | 'tin';
