import React from 'react';
import { View } from 'react-native';
import { BrassButton } from './BrassButton';
import { Tape } from './Tape';

/** Floating "TOSS IN" label + brass + button. */
export function TossFab({ onPress }: { onPress: () => void }) {
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: 20,
        bottom: 22,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
      }}
    >
      <Tape text="Toss in" tilt={-3} style={{ marginBottom: 6, marginRight: -24, zIndex: 1 }} />
      <BrassButton label="+" onPress={onPress} size={68} accessibilityLabel="Toss something in" />
    </View>
  );
}
