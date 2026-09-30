import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles, useTheme } from '../theme';

export type TapeSize = 'sm' | 'md' | 'lg';

type Props = {
  text: string;
  /** Label colours; defaults to the black label-maker tape. */
  bg?: string;
  fg?: string;
  size?: TapeSize;
  /** Degrees. */
  tilt?: number;
  /** Render the text as an unreadable blur (locked items). */
  blurred?: boolean;
  /** Content pinned to the right of the label, e.g. a LOCKED badge. */
  right?: React.ReactNode;
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZES = {
  sm: { fontSize: 11, padV: 6, padH: 10, spacing: 1.6 },
  md: { fontSize: 14, padV: 8, padH: 13, spacing: 2 },
  lg: { fontSize: 20, padV: 11, padH: 16, spacing: 2.4 },
} as const;

/** A strip of label-maker tape. The building block for logos, tags and buttons. */
export function Tape({ text, bg, fg, size = 'md', tilt = 0, blurred, right, stretch, style }: Props) {
  const { c, fonts } = useTheme();
  const s = SIZES[size];
  const styles = useThemedStyles(() => ({
    base: {
      alignSelf: stretch ? 'stretch' : 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: 3,
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    } as ViewStyle,
  }));

  const color = fg ?? c.tapeInk;
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bg ?? c.tape,
          paddingVertical: s.padV,
          paddingHorizontal: s.padH,
          transform: [{ rotate: `${tilt}deg` }],
        },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        accessibilityElementsHidden={blurred}
        style={[
          {
            fontFamily: fonts.monoBold,
            fontSize: s.fontSize,
            letterSpacing: s.spacing,
            textTransform: 'uppercase',
            color,
          },
          blurred && {
            color: 'transparent',
            textShadowColor: color,
            textShadowRadius: 7,
            textShadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {text}
      </Text>
      {right}
    </View>
  );
}
