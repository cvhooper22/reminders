import React, { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { Pill, Tape } from '../components';
import { HttpRepository, UnauthorizedError } from '../data/httpRepository';
import type { ItemsRepository } from '../data/repository';
import { useTheme, useThemedStyles } from '../theme';

type Props = {
  apiBase: string;
  /** Called with a repository that already proved the key works. */
  onLogin: (key: string, repository: ItemsRepository) => void;
};

export function LoginScreen({ apiBase, onLogin }: Props) {
  const { c } = useTheme();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles(({ c: p, fonts }) => ({
    title: { fontFamily: fonts.display, fontSize: 34, color: p.ink },
    sub: { fontFamily: fonts.meta, fontSize: 14, color: p.inkSoft },
    input: {
      backgroundColor: p.paper,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: p.paperEdge,
      paddingVertical: 18,
      paddingHorizontal: 22,
      fontFamily: fonts.mono,
      fontSize: 15,
      color: p.ink,
    },
    error: { fontFamily: fonts.meta, fontSize: 13, color: p.ink },
    link: { fontFamily: fonts.meta, fontSize: 13, color: p.inkSoft, textDecorationLine: 'underline' },
  }));

  const trimmed = key.trim();

  const submit = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const repository = new HttpRepository(apiBase, trimmed);
    try {
      await repository.list();
      onLogin(trimmed, repository);
    } catch (e) {
      setError(
        e instanceof UnauthorizedError
          ? "That key isn't recognized."
          : "Couldn't reach the server. Try again in a moment.",
      );
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, gap: 20, justifyContent: 'center' }}>
      <View style={{ alignSelf: 'flex-start' }}>
        <Tape text="Junk·Drawer" size="lg" tilt={-2} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.title}>Open your drawer</Text>
        <Text style={styles.sub}>Paste the key you got when you set up.</Text>
      </View>
      <TextInput
        value={key}
        onChangeText={setKey}
        onSubmitEditing={submit}
        placeholder="your key"
        placeholderTextColor={c.inkFaint}
        accessibilityLabel="Your key"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        returnKeyType="go"
        style={styles.input}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ opacity: trimmed && !busy ? 1 : 0.4 }} pointerEvents={trimmed && !busy ? 'auto' : 'none'}>
          <Pill label={busy ? 'checking…' : 'open'} variant="solid" onPress={submit} />
        </View>
        {Platform.OS === 'web' ? (
          <Text
            style={styles.link}
            accessibilityRole="link"
            onPress={() => window.location.assign('/setup.html')}
          >
            Don't have a key? Get one
          </Text>
        ) : null}
      </View>
    </View>
  );
}
