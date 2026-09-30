import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../theme';

type Props = { label: string; value: boolean; onChange: (v: boolean) => void };

export function Toggle({ label, value, onChange }: Props) {
  const styles = useThemedStyles(({ c, fonts }) => ({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    box: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: c.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    on: { backgroundColor: c.ink },
    tick: { color: c.paper, fontFamily: fonts.monoBold, fontSize: 14, lineHeight: 16 },
    label: { fontFamily: fonts.meta, fontSize: 15, color: c.ink },
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <View style={[styles.box, value && styles.on]}>
        {value ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
