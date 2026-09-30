import React from 'react';
import { Text, View } from 'react-native';
import { DrawerPanel, SuggestionCard, Tape } from '../components';
import { colorFor, tiltFor } from '../lib/hash';
import { ago } from '../lib/time';
import { useThemedStyles, useTheme } from '../theme';
import type { Item } from '../types';

const SUGGESTIONS: { text: string; tilt: number }[] = [
  { text: 'where are my keys?', tilt: -2 },
  { text: 'passport', tilt: 1.5 },
  { text: "when's the dentist?", tilt: 1 },
  { text: 'wifi', tilt: -1.5 },
];

type Props = {
  items: Item[];
  onSearch: (query: string) => void;
};

export function HomeScreen({ items, onSearch }: Props) {
  const { c } = useTheme();
  const tinCount = items.filter((i) => i.isSecret).length;
  const last = items.find((i) => !i.isSecret);

  const styles = useThemedStyles(({ c: p, fonts }) => ({
    hero: { fontFamily: fonts.display, fontSize: 50, lineHeight: 52, color: p.ink, letterSpacing: -1 },
    count: { fontFamily: fonts.mono, fontSize: 13, color: p.inkSoft, marginTop: 14 },
    caption: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.8, color: p.inkSoft },
    cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
    lastCaption: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.8, color: p.drawerSoft },
    lastAgo: { fontFamily: fonts.meta, fontSize: 15, color: p.drawerInk, marginTop: 12 },
  }));

  return (
    <View style={{ gap: 28 }}>
      <View>
        <Text style={styles.hero}>{"Everything's\nin here.\nSomewhere."}</Text>
        <Text style={styles.count}>
          {items.length} odds &amp; ends · {tinCount} in the locked tin
        </Text>
      </View>

      <View>
        <Text style={styles.caption}>TRY RUMMAGING FOR</Text>
        <View style={styles.cards}>
          {SUGGESTIONS.map((s) => (
            <SuggestionCard key={s.text} text={s.text} tilt={s.tilt} onPress={() => onSearch(s.text)} />
          ))}
        </View>
      </View>

      {last ? (
        <DrawerPanel>
          <Text style={styles.lastCaption}>LAST THING TOSSED IN</Text>
          <View style={{ marginTop: 14 }}>
            <Tape
              text={last.thing}
              bg={c.tags[last.color ?? colorFor(last.id)].bg}
              fg={c.tags[last.color ?? colorFor(last.id)].fg}
              size="lg"
              tilt={tiltFor(last.id)}
            />
          </View>
          <Text style={styles.lastAgo}>{ago(last.createdAt)}</Text>
        </DrawerPanel>
      ) : null}
    </View>
  );
}
