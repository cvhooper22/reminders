import { colorFor } from '../lib/hash';
import type { Item, Kind } from '../types';
import type { ItemsRepository } from './repository';

type ItemJson = {
  id: string;
  kind: Kind;
  thing: string;
  rawText: string;
  location: string | null;
  detail: string | null;
  remindAt: string | null;
  isSecret: boolean;
  createdAt: string;
  unread: boolean;
  lastAskedAt: string | null;
};

const revive = (j: ItemJson): Item => ({
  ...j,
  remindAt: j.remindAt ? new Date(j.remindAt) : null,
  createdAt: new Date(j.createdAt),
  lastAskedAt: j.lastAskedAt ? new Date(j.lastAskedAt) : null,
  color: colorFor(j.id),
});

/**
 * Talks to the Firebase functions (local emulator or deployed).
 * `baseUrl` looks like http://127.0.0.1:5001/demo-reminders/us-central1
 */
export class HttpRepository implements ItemsRepository {
  private pin: string | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async post(fn: string, body?: unknown, pin: string | null = this.pin): Promise<Response> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-app-key': this.apiKey,
    };
    if (pin) headers['x-tin-pin'] = pin;
    return fetch(`${this.baseUrl}/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
  }

  private async ok(res: Response, what: string): Promise<Response> {
    if (!res.ok) throw new Error(`${what} failed (${res.status})`);
    return res;
  }

  async list() {
    const res = await this.ok(await this.post('items'), 'list');
    const { items } = (await res.json()) as { items: ItemJson[] };
    return items.map(revive);
  }

  async capture(rawText: string, opts: { secret?: boolean } = {}) {
    const res = await this.ok(await this.post('capture', { text: rawText, secret: opts.secret }), 'capture');
    const { item } = (await res.json()) as { item: ItemJson };
    return revive(item);
  }

  async remove(id: string) {
    await this.ok(await this.post('removeItem', { id }), 'remove');
  }

  async setUnread(id: string, unread: boolean) {
    await this.ok(await this.post('setUnread', { id, unread }), 'setUnread');
  }

  async unlock(pin: string) {
    const res = await this.post('unlock', { pin }, null);
    if (res.status === 401) return false;
    await this.ok(res, 'unlock');
    this.pin = pin;
    return true;
  }

  lock() {
    this.pin = null;
  }
}
