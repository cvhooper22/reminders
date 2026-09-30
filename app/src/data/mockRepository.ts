import { colorFor } from '../lib/hash';
import { parseCapture } from '../lib/parse';
import type { Item } from '../types';
import type { ItemsRepository } from './repository';
import { seedItems } from './seed';

const DEMO_PIN = '1234';
const delay = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));

// Same redaction the real backend applies to secrets while the tin is locked.
const redact = (item: Item): Item =>
  item.isSecret ? { ...item, thing: 'private thing', rawText: '', location: null, remindAt: null } : item;

/** In-memory stand-in for the Firebase backend. State resets on reload. */
export class MockRepository implements ItemsRepository {
  private items: Item[] = seedItems();
  private open = false;

  async list() {
    await delay();
    return [...this.items]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((i) => (this.open ? i : redact(i)));
  }

  async capture(rawText: string, opts: { secret?: boolean } = {}) {
    await delay();
    const parsed = parseCapture(rawText);
    const id = `n${Date.now()}`;
    const item: Item = {
      id,
      thing: parsed.thing || rawText.trim(),
      rawText: rawText.trim(),
      location: parsed.location,
      remindAt: parsed.remindAt,
      isSecret: opts.secret === true || parsed.isSecret,
      createdAt: new Date(),
      color: colorFor(id),
    };
    this.items = [item, ...this.items];
    return item;
  }

  async remove(id: string) {
    await delay(60);
    this.items = this.items.filter((i) => i.id !== id);
  }

  async setUnread(id: string, unread: boolean) {
    await delay(60);
    this.items = this.items.map((i) => (i.id === id ? { ...i, unread } : i));
  }

  async unlock(pin: string) {
    await delay(80);
    this.open = pin === DEMO_PIN;
    return this.open;
  }

  lock() {
    this.open = false;
  }
}

export const DEMO_PIN_HINT = DEMO_PIN;
