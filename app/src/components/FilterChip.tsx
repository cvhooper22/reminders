import React from 'react';
import { Pressable, Text } from 'react-native';
import { useThemedStyles } from '../theme';

type Props = { label: string; active: boolean; onPress: () => void };

export function FilterChip({ label, active, onPress }: Props) {
  const styles = useThemedStyles(({ c, fonts }) => ({
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 4,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.inkSoft,
    },
    chipActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
      borderStyle: 'solid',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    text: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 1.5, color: c.ink },
    textActive: { color: c.accentInk },
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}
