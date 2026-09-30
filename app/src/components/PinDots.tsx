import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';

export function PinDots({ length, filled }: { length: number; filled: number }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityLabel={`${filled} of ${length} digits entered`}
      style={{ flexDirection: 'row', gap: 16 }}
    >
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: c.ink,
            backgroundColor: i < filled ? c.ink : 'transparent',
          }}
        />
      ))}
    </View>
  );
}
