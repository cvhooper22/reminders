# Junk Drawer (app)

Expo + React Native + TypeScript. One codebase for iOS, Android and web (via react-native-web).

```bash
npm install
npm run web      # browser, renders inside a phone frame on wide screens
npm run ios      # or: npm run android
```

Demo PIN for the locked tin: `1234` (dev builds show it on the keypad screen).

## Login

With `EXPO_PUBLIC_API_BASE` set (see `.env.example`), the app shows a login screen where a person
pastes their API key. The key is checked against the backend and remembered in the browser's
`localStorage` (`jd.apiKey`; web only, native doesn't remember it yet). "log out" in the header
clears it. A key the backend later rejects (401) also sends you back to the login screen.
Keys come from the signup page (`public/setup.html`, served at `/setup.html`), whose
"Open my drawer" button stores the new key and lands you in the app already logged in.

`EXPO_PUBLIC_API_KEY` is a dev-only shortcut that skips the login; it's ignored by production
exports. Anyone with a key can read that person's items, and `localStorage` is readable by any
script on the page, so don't add third-party scripts to the web build.

## Building for the web

```bash
npm run build:web   # exports to firebase/dist, pointed at the deployed backend (see package.json)
```
`firebase deploy --only hosting` runs this for you (`predeploy` in `firebase/firebase.json`) and
serves `firebase/dist`.

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
