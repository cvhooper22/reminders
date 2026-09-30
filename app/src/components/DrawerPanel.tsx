import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '../theme';

/** The dark-green felt-lined drawer that items sit in. */
export function DrawerPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(({ c, radius }) => ({
    panel: {
      backgroundColor: c.drawer,
      borderRadius: radius.xl,
      padding: 22,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  }));
  return <View style={[styles.panel, style]}>{children}</View>;
}
