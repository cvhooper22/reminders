# Junk Drawer (app)

Expo + React Native + TypeScript. One codebase for iOS, Android and web (via react-native-web).

```bash
npm install
npm run web      # browser, renders inside a phone frame on wide screens
npm run ios      # or: npm run android
```

Demo PIN for the locked tin: `1234` (dev builds show it on the keypad screen).

## Layout

```
App.tsx                     providers + font loading; where the repository is chosen
src/
  theme/                    tokens (day/night palettes, fonts, spacing), ThemeProvider,
                            useTheme(), useThemedStyles()
  components/               presentational pieces: Tape, Pill, FilterChip, SearchField,
                            DrawerPanel, ItemRow, BrassButton, KeyPad, PinDots, TinLid,
                            TossFab, TossSheet, WoodBackground, ...
  screens/                  Shell (phone frame on web), RootScreen (nav state + chrome),
                            HomeScreen, DrawerScreen, TinLockScreen
  state/ItemsProvider.tsx   items + tin lock state, talks only to an ItemsRepository
  data/                     ItemsRepository interface, MockRepository, seed data
  lib/                      search (mirrors the recall function), parse (mirrors capture),
                            time formatting, hash-based tilt/colour
```

## Theming

Colours live in `src/theme/tokens.ts` as two `Palette`s (`lightPalette`, `nightPalette`).
Components never hard-code colours; they call `useThemedStyles(({ c, fonts }) => ({ ... }))`.

## Wiring to the real backend

The UI only uses `ItemsRepository` (`src/data/repository.ts`). To go live, implement it
against the Firebase functions and swap it in `App.tsx`. Gaps the backend needs first:

- a **list** endpoint (only `capture` and `recall` exist today)
- **remove** and **PIN verify** endpoints. The PIN is a client-side stub; the real tin
  should be gated by device biometrics (`expo-local-authentication`) or a server check.
