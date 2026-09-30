import React from 'react';
import { TextInput } from 'react-native';
import { useThemedStyles, useTheme } from '../theme';

type Props = { value: string; onChangeText: (t: string) => void };

export function SearchField({ value, onChangeText }: Props) {
  const { c } = useTheme();
  const styles = useThemedStyles(({ c: p, fonts }) => ({
    input: {
      backgroundColor: p.paper,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: p.paperEdge,
      paddingVertical: 18,
      paddingHorizontal: 22,
      fontFamily: fonts.displayMedium,
      fontSize: 16,
      color: p.ink,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
    },
  }));

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="rummage for… keys? that password?"
      placeholderTextColor={c.inkFaint}
      accessibilityLabel="Search the drawer"
      returnKeyType="search"
      autoCorrect={false}
      style={styles.input}
    />
  );
}
