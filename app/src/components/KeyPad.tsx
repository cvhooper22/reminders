import React from 'react';
import { View } from 'react-native';
import { BrassButton } from './BrassButton';

type Props = { onDigit: (d: string) => void; onDelete: () => void };

const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];
const KEY = 78;

export function KeyPad({ onDigit, onDelete }: Props) {
  return (
    <View style={{ gap: 14, alignItems: 'center' }}>
      {ROWS.map((row) => (
        <View key={row[0]} style={{ flexDirection: 'row', gap: 22 }}>
          {row.map((d) => (
            <BrassButton key={d} label={d} size={KEY} fontSize={30} onPress={() => onDigit(d)} />
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 22 }}>
        <View style={{ width: KEY, height: KEY }} />
        <BrassButton label="0" size={KEY} onPress={() => onDigit('0')} />
        <BrassButton
          label="⌫"
          size={KEY}
          fontSize={26}
          onPress={onDelete}
          accessibilityLabel="Delete last digit"
        />
      </View>
    </View>
  );
}
