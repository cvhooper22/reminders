import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppHeader, FilterChip, SearchField, TossFab, TossSheet } from '../components';
import { rummage } from '../lib/search';
import { useItems } from '../state/ItemsProvider';
import { useToggleMode } from '../theme';
import type { Filter } from '../types';
import { DrawerScreen } from './DrawerScreen';
import { HomeScreen } from './HomeScreen';
import { TinLockScreen } from './TinLockScreen';

const FRESH_HOURS = 24 * 4;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'tin', label: 'Locked tin' },
];

/**
 * Owns navigation state (filter, query, PIN pad, toss sheet) and the persistent
 * chrome. Swap this for react-navigation when the app grows past three screens.
 */
export function RootScreen({ onLogout }: { onLogout?: () => void }) {
  const { items, unlocked, capture, remove, setUnread, unlock, lock } = useItems();
  const toggleNight = useToggleMode();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [padOpen, setPadOpen] = useState(false);
  const [tossOpen, setTossOpen] = useState(false);

  const tinCount = useMemo(() => items.filter((i) => i.isSecret).length, [items]);

  const unreadCount = useMemo(() => items.filter((i) => i.isSecret && i.unread).length, [items]);

  // Secret items only ever appear in the tin; everything else lives in "all" and "fresh".
  const results = useMemo(() => {
    const now = Date.now();
    const pool =
      filter === 'tin'
        ? items.filter((i) => i.isSecret)
        : items
            .filter((i) => !i.isSecret)
            .filter((i) => filter !== 'fresh' || now - i.createdAt.getTime() < FRESH_HOURS * 3600000);
    const found = rummage(pool, query);
    // Unread (asked-for) private items float to the top of the tin; sort is stable.
    return filter === 'tin' ? [...found].sort((a, b) => Number(!!b.unread) - Number(!!a.unread)) : found;
  }, [items, filter, query]);

  const showHome = filter === 'all' && query.trim() === '';

  const onSearch = (q: string) => {
    setQuery(q);
    if (filter === 'tin') return;
    setFilter('all');
  };

  const onTogglePad = () => {
    if (unlocked) lock();
    else setPadOpen(true);
  };

  const submitPin = async (pin: string) => {
    const ok = await unlock(pin);
    if (ok) {
      setPadOpen(false);
      setFilter('tin');
      setQuery('');
    }
    return ok;
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 16 }}>
        <AppHeader unlocked={unlocked} onTogglePad={onTogglePad} onToggleNight={toggleNight} onLogout={onLogout} />
        {padOpen ? null : (
          <>
            <SearchField value={query} onChangeText={onSearch} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {FILTERS.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.key === 'tin' && unreadCount > 0 ? `${f.label} · ${unreadCount}` : f.label}
                  active={filter === f.key}
                  onPress={() => {
                    setFilter(f.key);
                    if (f.key === 'tin' && !unlocked) setQuery('');
                  }}
                />
              ))}
            </View>
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {padOpen ? (
          <TinLockScreen tinCount={tinCount} onBack={() => setPadOpen(false)} onSubmit={submitPin} />
        ) : showHome ? (
          <HomeScreen items={items} onSearch={onSearch} />
        ) : (
          <DrawerScreen
            results={results}
            unlocked={unlocked}
            onLockedPress={() => setPadOpen(true)}
            onRemove={remove}
            onToggleUnread={(item) => setUnread(item.id, !item.unread)}
          />
        )}
      </ScrollView>

      {padOpen ? null : <TossFab onPress={() => setTossOpen(true)} />}
      <TossSheet
        visible={tossOpen}
        onClose={() => setTossOpen(false)}
        onSubmit={async (text, opts) => {
          await capture(text, opts);
        }}
      />
    </View>
  );
}
