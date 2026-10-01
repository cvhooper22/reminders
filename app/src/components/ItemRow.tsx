import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ago, formatRemind } from '../lib/time';
import { colorFor, maskText, tiltFor } from '../lib/hash';
import { useThemedStyles, useTheme } from '../theme';
import type { Item } from '../types';
import { Pill } from './Pill';
import { Tape } from './Tape';

type Props = {
  item: Item;
  /** Secret item while the tin is closed: blurred, tap to unlock. */
  locked: boolean;
  expanded: boolean;
  onPress: () => void;
  onRemove: () => void;
  onSave: (fields: { thing: string; where: string | null }) => Promise<void>;
  onToggleUnread: () => void;
};

export function ItemRow({ item, locked, expanded, onPress, onRemove, onSave, onToggleUnread }: Props) {
  const { c } = useTheme();
  const [editing, setEditing] = useState(false);
  const [thing, setThing] = useState('');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);
  const tag = c.tags[item.color ?? colorFor(item.id)];
  const tilt = tiltFor(item.id);

  const styles = useThemedStyles(({ c: p, fonts }) => ({
    meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingLeft: 2 },
    where: { fontFamily: fonts.meta, fontSize: 14, color: p.drawerInk, flexShrink: 1 },
    when: { fontFamily: fonts.meta, fontSize: 14, color: p.drawerSoft },
    badge: {
      borderWidth: 1,
      borderRadius: 2,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    badgeText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.2 },
    raw: { fontFamily: fonts.meta, fontSize: 13, color: p.drawerSoft, marginTop: 10, lineHeight: 19 },
    actions: { flexDirection: 'row', marginTop: 12 },
    input: {
      backgroundColor: p.paper,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: p.paperEdge,
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontFamily: fonts.meta,
      fontSize: 15,
      color: p.ink,
      marginTop: 10,
    },
  }));

  const when = item.remindAt ? `◷ ${formatRemind(item.remindAt)}` : null;
  const what = item.detail ? `↳ ${item.detail}` : item.location ? `↳ ${item.location}` : null;
  const detail = item.kind === 'todo' ? [when, what].filter(Boolean).join('  ') || null : what ?? when;

  const startEdit = () => {
    setThing(item.thing);
    setWhere(item.detail || item.location || '');
    setEditing(true);
  };

  const save = async () => {
    if (!thing.trim() || busy) return;
    setBusy(true);
    try {
      await onSave({ thing: thing.trim(), where: where.trim() || null });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locked ? 'Locked item. Tap to unlock the tin.' : item.thing}
    >
      <Tape
        text={locked ? maskText(item.thing) : item.thing}
        bg={tag.bg}
        fg={tag.fg}
        size="lg"
        tilt={tilt}
        blurred={locked}
        stretch={locked}
        right={
          locked ? (
            <View style={[styles.badge, { borderColor: tag.fg }]}>
              <Text style={[styles.badgeText, { color: tag.fg }]}>LOCKED</Text>
            </View>
          ) : undefined
        }
      />
      <View style={styles.meta}>
        {item.unread ? (
          <View style={[styles.badge, { borderColor: tag.fg, backgroundColor: tag.bg }]}>
            <Text style={[styles.badgeText, { color: tag.fg }]}>● ASKED</Text>
          </View>
        ) : null}
        {!locked && detail ? <Text style={styles.where}>{detail}</Text> : null}
        <Text style={styles.when}>{ago(item.createdAt)}</Text>
      </View>
      {expanded && !locked ? (
        editing ? (
          <View>
            <TextInput
              value={thing}
              onChangeText={setThing}
              autoFocus
              style={styles.input}
              accessibilityLabel="Label"
              placeholder="label"
              placeholderTextColor={c.inkFaint}
            />
            <TextInput
              value={where}
              onChangeText={setWhere}
              style={styles.input}
              accessibilityLabel="Where or details"
              placeholder="where / details"
              placeholderTextColor={c.inkFaint}
            />
            <View style={styles.actions}>
              <Pill label="never mind" onPress={() => setEditing(false)} />
              <Pill label={busy ? 'saving…' : 'save'} variant="solid" onPress={save} />
            </View>
          </View>
        ) : (
        <View>
          <Text style={styles.raw}>“{item.rawText}”</Text>
          <View style={styles.actions}>
            <Pill label="edit" onPress={startEdit} />
            {item.isSecret ? (
              <Pill
                label={item.unread ? 'mark read' : 'mark unread'}
                onPress={onToggleUnread}
                variant={item.unread ? 'solid' : 'outline'}
              />
            ) : null}
            <Pill label="toss it out" onPress={onRemove} />
          </View>
        </View>
        )
      ) : null}
    </Pressable>
  );
}
