import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

// Deterministic pseudo-random so the grain doesn't shift between renders.
function stripes(count: number) {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () => ({
    left: `${(rand() * 100).toFixed(2)}%` as `${number}%`,
    width: 1 + Math.round(rand() * 2),
    opacity: 0.35 + rand() * 0.65,
  }));
}

export function WoodBackground({ children }: { children?: React.ReactNode }) {
  const { c } = useTheme();
  const lines = useMemo(() => stripes(34), []);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.wood }]}>
      {lines.map((s, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: s.left,
            width: s.width,
            opacity: s.opacity,
            backgroundColor: c.grain,
          }}
        />
      ))}
      {children}
    </View>
  );
}
