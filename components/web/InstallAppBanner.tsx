import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';

/**
 * "Install KalawGuide" banner for the website (PWA), for people who don't want the APK.
 * - iPhone/iPad: Safari has no install button, so it explains Share → Add to Home Screen.
 * - Android/desktop Chrome/Edge: a real Install button (beforeinstallprompt).
 * Hidden once the app runs installed, and for 14 days after "Not now".
 * Rendered outside the theme provider, so it uses fixed brand colors.
 */

const DISMISS_KEY = 'kg-install-dismissed-at';
const DISMISS_DAYS = 14;

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isInstalled(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

export function InstallAppBanner() {
  const [mode, setMode] = useState<'hidden' | 'ios' | 'prompt'>('hidden');
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  // Wide screens: a small card in the bottom-left corner, clear of centered forms and buttons
  // (it used to sit on top of the Sign In button). Phones: full-width card at the bottom.
  const wide = useWindowDimensions().width >= 768;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (isInstalled() || recentlyDismissed()) return;

    // Wait a moment so the banner doesn't cover the page as it first appears.
    const timer = isIOS() ? setTimeout(() => setMode('ios'), 2500) : undefined;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => setMode('hidden');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (mode === 'hidden') return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
    setMode('hidden');
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => null);
    setPromptEvent(null);
    setMode('hidden');
  };

  return (
    <View style={[s.wrap, wide && s.wrapWide]} accessibilityRole="alert">
      <View style={[s.card, wide && s.cardWide]}>
        <View style={s.textCol}>
          <Text style={s.title}>Install KalawGuide</Text>
          {mode === 'ios' ? (
            <Text style={s.body}>
              No download needed: tap <Text style={s.bold}>Share</Text> (the square with an arrow ⬆), then{' '}
              <Text style={s.bold}>Add to Home Screen</Text>.
            </Text>
          ) : (
            <Text style={s.body}>Add it to your home screen and open it like an app, no APK needed.</Text>
          )}
        </View>
        <View style={s.actions}>
          {mode === 'prompt' && (
            <TouchableOpacity style={s.installBtn} onPress={install} accessibilityRole="button" accessibilityLabel="Install KalawGuide">
              <Text style={s.installText}>Install</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.laterBtn} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Not now">
            <Text style={s.laterText}>{mode === 'ios' ? 'Got it' : 'Not now'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'fixed' as any, left: 0, right: 0, bottom: 0, zIndex: 9999,
    paddingHorizontal: 12, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' as any, alignItems: 'center',
  },
  wrapWide: { right: 'auto' as any, left: 16, paddingHorizontal: 0, alignItems: 'flex-start' },
  cardWide: { width: 360, maxWidth: 360 },
  card: {
    width: '100%' as any, maxWidth: 520, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12,
    backgroundColor: '#072D4B', borderRadius: 16, padding: 14,
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)' as any,
  },
  textCol: { flex: 1, minWidth: 200, gap: 4 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  body: { color: '#D6E4EE', fontSize: 13, lineHeight: 18 },
  bold: { fontWeight: '700', color: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  installBtn: { backgroundColor: '#22B8C7', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  installText: { color: '#072D4B', fontSize: 14, fontWeight: '700' },
  laterBtn: { paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  laterText: { color: '#D6E4EE', fontSize: 14, fontWeight: '600' },
});
