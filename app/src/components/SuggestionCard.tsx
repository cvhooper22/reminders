import React from 'react';
import { Pressable, Text } from 'react-native';
import { useThemedStyles } from '../theme';

type Props = { text: string; tilt?: number; onPress: () => void };

/** A torn scrap of paper with a search idea on it. */
export function SuggestionCard({ text, tilt = 0, onPress }: Props) {
  const styles = useThemedStyles(({ c, fonts }) => ({
    card: {
      backgroundColor: c.paper,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 3,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    text: { fontFamily: fonts.display, fontSize: 17, color: c.ink },
  }));
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { transform: [{ rotate: `${tilt}deg` }, { scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}
