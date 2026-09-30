import React from 'react';
import { Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  size?: number;
  fontSize?: number;
  accessibilityLabel?: string;
};

/** Round brass knob: the FAB and the keypad keys. */
export function BrassButton({ label, onPress, size = 76, fontSize = 30, accessibilityLabel }: Props) {
  const { c, fonts } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        transform: [{ scale: pressed ? 0.93 : 1 }],
      })}
    >
      <LinearGradient
        colors={c.brass}
        start={{ x: 0.2, y: 0.05 }}
        end={{ x: 0.85, y: 1 }}
        style={{
          flex: 1,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: fonts.display, fontSize, color: '#2A1E0C' }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
