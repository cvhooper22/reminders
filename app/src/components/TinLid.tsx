import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { Tape } from './Tape';

/** Top-down view of a biscuit tin with a PRIVATE label stuck across it. */
export function TinLid({ size = 190 }: { size?: number }) {
  const { c } = useTheme();
  const inner = size * 0.86;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      }}
    >
      <LinearGradient
        colors={c.steel}
        start={{ x: 0.15, y: 0.05 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            borderWidth: 2,
            borderColor: 'rgba(0,0,0,0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Tape text="Private" tilt={-4} size="md" />
        </View>
      </LinearGradient>
    </View>
  );
}
