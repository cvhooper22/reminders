import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { HttpRepository } from './src/data/httpRepository';
import { MockRepository } from './src/data/mockRepository';
import type { ItemsRepository } from './src/data/repository';
import { clearKey, loadKey, saveKey } from './src/lib/session';
import { LoginScreen, RootScreen, Shell } from './src/screens';
import { ItemsProvider } from './src/state/ItemsProvider';
import { ThemeProvider, fontAssets } from './src/theme';

// EXPO_PUBLIC_API_BASE (app/.env.local, see .env.example) points the app at the backend; unset,
// it runs against in-memory mock data with no login. People sign in with their own key, which
// is remembered in the browser. EXPO_PUBLIC_API_KEY is an optional dev shortcut that skips
// the login screen; don't set it for a build you deploy, since it's baked into the bundle.
const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
// Guarded by __DEV__ so a production export folds this away and never contains the value.
const DEV_API_KEY = __DEV__ ? process.env.EXPO_PUBLIC_API_KEY : undefined;

function initialRepository(): ItemsRepository | null {
  if (!API_BASE) return new MockRepository();
  const key = loadKey() ?? DEV_API_KEY;
  return key ? new HttpRepository(API_BASE, key) : null;
}

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [repository, setRepository] = useState<ItemsRepository | null>(initialRepository);

  const onLogin = useCallback((key: string, repo: ItemsRepository) => {
    saveKey(key);
    setRepository(repo);
  }, []);

  const onLogout = useCallback(() => {
    clearKey();
    setRepository(null);
  }, []);

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
        <Shell>
          {repository ? (
            <ItemsProvider repository={repository} onUnauthorized={API_BASE ? onLogout : undefined}>
              <RootScreen onLogout={API_BASE ? onLogout : undefined} />
            </ItemsProvider>
          ) : (
            <LoginScreen apiBase={API_BASE!} onLogin={onLogin} />
          )}
        </Shell>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
