import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { fonts, lightPalette, nightPalette, radius, space, type Palette } from './tokens';

export type Mode = 'day' | 'night';

export type Theme = {
  mode: Mode;
  c: Palette;
  fonts: typeof fonts;
  space: typeof space;
  radius: typeof radius;
};

type Ctx = { theme: Theme; toggleMode: () => void };

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<Mode>(system === 'dark' ? 'night' : 'day');
  const toggleMode = useCallback(() => setMode((m) => (m === 'day' ? 'night' : 'day')), []);

  const value = useMemo<Ctx>(
    () => ({
      theme: {
        mode,
        c: mode === 'day' ? lightPalette : nightPalette,
        fonts,
        space,
        radius,
      },
      toggleMode,
    }),
    [mode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useCtx(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export const useTheme = (): Theme => useCtx().theme;
export const useToggleMode = (): (() => void) => useCtx().toggleMode;

/** Build a StyleSheet from the current theme; re-created only when the theme changes. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
