import { Platform } from 'react-native';

// The web signup page (public/setup.html) writes the same key so a new user lands logged in.
const STORAGE_KEY = 'jd.apiKey';

// localStorage can be missing or throw (private windows, blocked site data), and native has
// none: in those cases the key simply isn't remembered between visits.
export function loadKey(): string | null {
  if (Platform.OS !== 'web') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveKey(key: string) {
  if (Platform.OS !== 'web') return;
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // not remembered
  }
}

export function clearKey() {
  if (Platform.OS !== 'web') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}
