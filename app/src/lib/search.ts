import type { Item } from '../types';

// Same word-overlap scoring the `recall` Cloud Function uses, so what you find
// on screen matches what the voice assistant would find.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'i', 'my', 'me', 'you', 'your',
  'where', 'what', 'when', 'do', 'does', 'did', 'put', 'place', 'placed', 'have', 'has',
  'had', 'in', 'on', 'at', 'to', 'of', 'for', 'with', 'this', 'that', 'it', 'and', 'or',
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));

/** Items matching `query`, best match first. Empty query returns items unchanged. */
export function rummage(items: Item[], query: string): Item[] {
  const words = new Set(tokenize(query));
  if (query.trim() === '') return items;
  if (words.size === 0) return [];

  return items
    .map((item) => {
      const itemWords = new Set(tokenize(`${item.rawText} ${item.thing}`));
      let score = 0;
      for (const w of words) if (itemWords.has(w)) score++;
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.item.createdAt.getTime() - a.item.createdAt.getTime())
    .map((r) => r.item);
}
