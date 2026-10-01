import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UnauthorizedError } from '../data/httpRepository';
import type { ItemsRepository } from '../data/repository';
import type { Item } from '../types';

type Ctx = {
  items: Item[];
  loading: boolean;
  /** Whether the locked tin is currently open. */
  unlocked: boolean;
  capture: (rawText: string, opts?: { secret?: boolean }) => Promise<Item>;
  remove: (id: string) => Promise<void>;
  setUnread: (id: string, unread: boolean) => Promise<void>;
  /** Resolves true (and opens the tin) if the PIN is right. */
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
};

const ItemsContext = createContext<Ctx | null>(null);

export function ItemsProvider({
  repository,
  onUnauthorized,
  children,
}: {
  repository: ItemsRepository;
  /** The backend rejected the stored key (e.g. the account was deleted). */
  onUnauthorized?: () => void;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let live = true;
    repository
      .list()
      .then((list) => {
        if (!live) return;
        setItems(list);
        setLoading(false);
      })
      .catch((e) => {
        if (!live) return;
        setLoading(false);
        if (e instanceof UnauthorizedError) onUnauthorized?.();
      });
    return () => {
      live = false;
    };
  }, [repository, onUnauthorized]);

  const capture = useCallback<Ctx['capture']>(
    async (rawText, opts) => {
      const item = await repository.capture(rawText, opts);
      setItems((prev) => [item, ...prev]);
      return item;
    },
    [repository],
  );

  const remove = useCallback<Ctx['remove']>(
    async (id) => {
      await repository.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [repository],
  );

  const setUnread = useCallback<Ctx['setUnread']>(
    async (id, unread) => {
      await repository.setUnread(id, unread);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unread } : i)));
    },
    [repository],
  );

  const unlock = useCallback<Ctx['unlock']>(
    async (pin) => {
      const ok = await repository.unlock(pin);
      if (ok) {
        // Refetch so the secrets arrive un-redacted.
        setItems(await repository.list());
        setUnlocked(true);
      }
      return ok;
    },
    [repository],
  );

  const lock = useCallback(() => {
    repository.lock();
    setUnlocked(false);
    // Drop the revealed text from memory by refetching the redacted list.
    repository.list().then(setItems);
  }, [repository]);

  const value = useMemo(
    () => ({ items, loading, unlocked, capture, remove, setUnread, unlock, lock }),
    [items, loading, unlocked, capture, remove, setUnread, unlock, lock],
  );

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
}

export function useItems(): Ctx {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used inside <ItemsProvider>');
  return ctx;
}
