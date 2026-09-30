import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WoodBackground } from '../components';
import { useTheme } from '../theme';

/**
 * Full-bleed on a phone. On a wide browser window it renders inside a phone-shaped
 * frame so the desktop preview looks like the design.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { c, mode } = useTheme();
  const { width, height } = useWindowDimensions();
  const framed = Platform.OS === 'web' && width > 520;

  const content = (
    <WoodBackground>
      <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
    </WoodBackground>
  );

  if (!framed) {
    return (
      <View style={{ flex: 1, backgroundColor: c.wood }}>
        <StatusBar style={mode === 'day' ? 'dark' : 'light'} />
        {content}
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.stage,
      }}
    >
      <View
        style={{
          width: 430,
          height: Math.min(height - 48, 860),
          borderRadius: 52,
          borderWidth: 12,
          borderColor: c.frame,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 20 },
        }}
      >
        <View style={StyleSheet.absoluteFill}>{content}</View>
      </View>
    </View>
  );
}
