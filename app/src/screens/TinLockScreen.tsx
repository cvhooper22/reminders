import React, { useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { KeyPad, PinDots, Pill, TinLid } from '../components';
import { DEMO_PIN_HINT } from '../data/mockRepository';
import { useThemedStyles } from '../theme';

const PIN_LENGTH = 4;

type Props = {
  tinCount: number;
  onBack: () => void;
  /** Resolves true if the PIN opened the tin. */
  onSubmit: (pin: string) => Promise<boolean>;
};

export function TinLockScreen({ tinCount, onBack, onSubmit }: Props) {
  const [pin, setPin] = useState('');
  const shake = useRef(new Animated.Value(0)).current;
  const styles = useThemedStyles(({ c, fonts }) => ({
    title: { fontFamily: fonts.display, fontSize: 34, color: c.ink },
    sub: { fontFamily: fonts.mono, fontSize: 13, color: c.inkSoft },
    hint: { fontFamily: fonts.meta, fontSize: 12, color: c.inkFaint },
  }));

  const wrong = () => {
    Animated.sequence(
      [-12, 12, -8, 8, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 55, useNativeDriver: true }),
      ),
    ).start();
    setPin('');
  };

  const press = async (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      const ok = await onSubmit(next);
      if (!ok) wrong();
    }
  };

  return (
    <View style={{ alignItems: 'center', gap: 20 }}>
      <View style={{ alignSelf: 'flex-start' }}>
        <Pill label="← back to the drawer" onPress={onBack} />
      </View>
      <TinLid />
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={styles.title}>The locked tin</Text>
        <Text style={styles.sub}>
          {tinCount} {tinCount === 1 ? 'thing' : 'things'} rattling around in here
        </Text>
      </View>
      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <PinDots length={PIN_LENGTH} filled={pin.length} />
      </Animated.View>
      <KeyPad onDigit={press} onDelete={() => setPin((p) => p.slice(0, -1))} />
      {__DEV__ ? <Text style={styles.hint}>demo PIN: {DEMO_PIN_HINT}</Text> : null}
    </View>
  );
}
