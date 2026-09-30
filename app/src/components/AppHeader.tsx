import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Pill } from './Pill';
import { Tape } from './Tape';

type Props = {
  unlocked: boolean;
  onTogglePad: () => void;
  onToggleNight: () => void;
};

export function AppHeader({ unlocked, onTogglePad, onToggleNight }: Props) {
  const { mode } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Tape text="Junk·Drawer" size="lg" tilt={-2} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pill
          label={unlocked ? 'unlocked' : 'locked'}
          onPress={onTogglePad}
          accessibilityLabel={unlocked ? 'Lock the tin' : 'Open the locked tin'}
        />
        <Pill
          label={mode === 'day' ? 'night' : 'day'}
          variant="solid"
          onPress={onToggleNight}
          accessibilityLabel="Toggle night mode"
        />
      </View>
    </View>
  );
}
