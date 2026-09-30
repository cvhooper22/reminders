import React, { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { HttpRepository } from './src/data/httpRepository';
import { MockRepository } from './src/data/mockRepository';
import type { ItemsRepository } from './src/data/repository';
import { RootScreen, Shell } from './src/screens';
import { ItemsProvider } from './src/state/ItemsProvider';
import { ThemeProvider, fontAssets } from './src/theme';

// Set both in app/.env.local (see .env.example) to talk to the backend; otherwise the
// app runs against in-memory mock data.
const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

function createRepository(): ItemsRepository {
  return API_BASE && API_KEY ? new HttpRepository(API_BASE, API_KEY) : new MockRepository();
}

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const repository = useMemo(createRepository, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2D3B1' }}>
        <ActivityIndicator color="#241C14" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ItemsProvider repository={repository}>
          <Shell>
            <RootScreen />
          </Shell>
        </ItemsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
