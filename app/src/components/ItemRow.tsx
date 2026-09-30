import React from 'react';
import { Pressable, Text, View } from 'react-native';
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
  onToggleUnread: () => void;
};

export function ItemRow({ item, locked, expanded, onPress, onRemove, onToggleUnread }: Props) {
  const { c } = useTheme();
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
  }));

  const when = item.remindAt ? `◷ ${formatRemind(item.remindAt)}` : null;
  const what = item.detail ? `↳ ${item.detail}` : item.location ? `↳ ${item.location}` : null;
  const detail = item.kind === 'todo' ? [when, what].filter(Boolean).join('  ') || null : what ?? when;

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
        <View>
          <Text style={styles.raw}>“{item.rawText}”</Text>
          <View style={styles.actions}>
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
      ) : null}
    </Pressable>
  );
}
