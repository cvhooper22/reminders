import React from 'react';
import { Pressable, Text } from 'react-native';
import { useThemedStyles } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'outline' | 'solid';
  accessibilityLabel?: string;
};

export function Pill({ label, onPress, variant = 'outline', accessibilityLabel }: Props) {
  const styles = useThemedStyles(({ c, fonts }) => ({
    base: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: c.ink,
    },
    solid: { backgroundColor: c.ink },
    text: { fontFamily: fonts.monoBold, fontSize: 12, color: c.ink },
    textSolid: { color: c.wood },
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && styles.solid,
        pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text style={[styles.text, variant === 'solid' && styles.textSolid]}>{label}</Text>
    </Pressable>
  );
}
