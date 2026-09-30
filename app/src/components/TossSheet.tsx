import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colorFor } from '../lib/hash';
import { parseCapture } from '../lib/parse';
import { formatRemind } from '../lib/time';
import { useThemedStyles, useTheme } from '../theme';
import { Pill } from './Pill';
import { Tape } from './Tape';
import { Toggle } from './Toggle';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rawText: string, opts: { secret: boolean }) => Promise<void>;
};

/** Bottom sheet for capturing a new item, with a live preview of the label it'll become. */
export function TossSheet({ visible, onClose, onSubmit }: Props) {
  const { c } = useTheme();
  const [text, setText] = useState('');
  const [secret, setSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
    if (!visible) {
      setText('');
      setSecret(false);
      return;
    }
    // autoFocus only fires on mount, and this sheet is mounted while hidden.
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [visible, slide]);

  const parsed = useMemo(() => parseCapture(text), [text]);
  const showSecret = secret || parsed.isSecret;
  const canSubmit = parsed.thing.length > 0 && !busy;
  const tag = c.tags[colorFor(parsed.thing || 'x')];

  const styles = useThemedStyles(({ c: p, fonts }) => ({
    scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,10,5,0.5)' },
    sheet: {
      backgroundColor: p.wood,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 22,
      gap: 16,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12,
    },
    title: { fontFamily: fonts.display, fontSize: 28, color: p.ink },
    hint: { fontFamily: fonts.meta, fontSize: 13, color: p.inkSoft },
    input: {
      minHeight: 88,
      backgroundColor: p.paper,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.paperEdge,
      padding: 16,
      fontFamily: fonts.displayMedium,
      fontSize: 18,
      color: p.ink,
      textAlignVertical: 'top',
    },
    preview: { gap: 8, minHeight: 64 },
    previewLine: { fontFamily: fonts.meta, fontSize: 14, color: p.inkSoft },
    caption: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1.6, color: p.inkSoft },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  }));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit(text, { secret });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal={visible}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: slide }]}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) },
              ],
            },
          ]}
        >
          <Text style={styles.title}>Toss something in</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            ref={inputRef}
            placeholder="keys in the bowl by the front door…"
            placeholderTextColor={c.inkFaint}
            style={styles.input}
            accessibilityLabel="What are you tossing in?"
          />

          <View style={styles.preview}>
            <Text style={styles.caption}>THE LABEL</Text>
            {parsed.thing ? (
              <>
                <Tape text={parsed.thing} bg={tag.bg} fg={tag.fg} size="lg" tilt={-1.5} />
                {parsed.location ? <Text style={styles.previewLine}>↳ {parsed.location}</Text> : null}
                {parsed.remindAt ? (
                  <Text style={styles.previewLine}>◷ {formatRemind(parsed.remindAt)}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.hint}>
                Say where you put it, or when you need it. You can also just tell Siri.
              </Text>
            )}
          </View>

          <Toggle label="Private — lock it in the tin" value={showSecret} onChange={setSecret} />

          <View style={styles.actions}>
            <Pill label="never mind" onPress={onClose} />
            <View style={{ opacity: canSubmit ? 1 : 0.4 }} pointerEvents={canSubmit ? 'auto' : 'none'}>
              <Pill label={busy ? 'tossing…' : 'toss in'} variant="solid" onPress={submit} />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
