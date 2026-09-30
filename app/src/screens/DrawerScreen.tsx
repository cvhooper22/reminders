import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { DrawerPanel, ItemRow } from '../components';
import { useThemedStyles } from '../theme';
import type { Item } from '../types';

type Props = {
  results: Item[];
  /** Whether the locked tin is open; secret items blur when it isn't. */
  unlocked: boolean;
  onLockedPress: () => void;
  onRemove: (id: string) => void;
  onToggleUnread: (item: Item) => void;
};

export function DrawerScreen({ results, unlocked, onLockedPress, onRemove, onToggleUnread }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const styles = useThemedStyles(({ c, fonts }) => ({
    count: { fontFamily: fonts.mono, fontSize: 13, color: c.inkSoft, marginBottom: 14, marginLeft: 4 },
    empty: { fontFamily: fonts.display, fontSize: 20, color: c.drawerInk, textAlign: 'center', paddingVertical: 24 },
    emptySub: { fontFamily: fonts.meta, fontSize: 14, color: c.drawerSoft, textAlign: 'center' },
  }));

  const noun = results.length === 1 ? 'thing' : 'things';

  return (
    <View>
      <Text style={styles.count}>
        {results.length} {noun} found in the drawer
      </Text>
      <DrawerPanel style={{ gap: 22 }}>
        {results.length === 0 ? (
          <View>
            <Text style={styles.empty}>Just lint and a rubber band.</Text>
            <Text style={styles.emptySub}>Nothing matches. Try fewer words.</Text>
          </View>
        ) : (
          results.map((item) => {
            const locked = item.isSecret && !unlocked;
            return (
              <ItemRow
                key={item.id}
                item={item}
                locked={locked}
                expanded={openId === item.id}
                onPress={() => (locked ? onLockedPress() : setOpenId(openId === item.id ? null : item.id))}
                onRemove={() => onRemove(item.id)}
                onToggleUnread={() => onToggleUnread(item)}
              />
            );
          })
        )}
      </DrawerPanel>
    </View>
  );
}
