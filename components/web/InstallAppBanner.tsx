import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image, useWindowDimensions } from 'react-native';

/**
 * "Install KalawGuide" popup for the website (PWA), for people who don't want the APK.
 * Shown to everyone who opens the website in a browser, until they install it.
 * - Android/desktop Chrome/Edge/Samsung Internet: a real Install button (beforeinstallprompt).
 * - iPhone/iPad: Safari has no install button, so it explains Share → Add to Home Screen.
 * - Other browsers: explains the browser-menu route.
 * Hidden once the app runs installed. "Not now" hides it until the next visit (this tab session).
 * Rendered outside the theme provider, so it uses fixed brand colors.
 */

const DISMISS_KEY = 'kg-install-dismissed';
const SHOW_AFTER_MS = 1500;

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chrome can fire beforeinstallprompt before React mounts, so catch it as soon as the bundle loads.
let earlyPrompt: InstallPromptEvent | null = null;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    earlyPrompt = e as InstallPromptEvent;
  });
}

function isInstalled(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function dismissedThisVisit(): boolean {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

type Mode = 'hidden' | 'prompt' | 'ios' | 'manual';

export function InstallAppBanner() {
  const [mode, setMode] = useState<Mode>('hidden');
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const wide = useWindowDimensions().width >= 768;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (isInstalled() || dismissedThisVisit()) return;

    // Wait a moment so the popup doesn't cover the page as it first appears.
    const timer = setTimeout(() => {
      if (earlyPrompt) {
        setPromptEvent(earlyPrompt);
        setMode('prompt');
      } else {
        setMode(isIOS() ? 'ios' : 'manual');
      }
    }, SHOW_AFTER_MS);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      earlyPrompt = e as InstallPromptEvent;
      setPromptEvent(earlyPrompt);
      // Upgrade the instructions to a real Install button if the popup is already open.
      setMode(m => (m === 'manual' ? 'prompt' : m));
    };
    const onInstalled = () => setMode('hidden');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (mode === 'hidden') return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
    setMode('hidden');
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    earlyPrompt = null;
    setPromptEvent(null);
    if (choice?.outcome === 'accepted') setMode('hidden');
    else dismiss();
  };

  let body: React.ReactNode;
  if (mode === 'prompt') {
    body = 'Add it to your home screen and open it like an app. No APK or app store needed.';
  } else if (mode === 'ios') {
    body = (
      <>
        No download needed: tap <Text style={s.bold}>Share</Text> (the square with an arrow ⬆), then{' '}
        <Text style={s.bold}>Add to Home Screen</Text>.
      </>
    );
  } else {
    body = (
      <>
        Open your browser menu ({isAndroid() ? '⋮' : '⋮ or ⋯'}) and choose{' '}
        <Text style={s.bold}>Install app</Text> or <Text style={s.bold}>Add to Home screen</Text>.
      </>
    );
  }

  return (
    <View style={s.backdrop} accessibilityViewIsModal>
      <TouchableOpacity style={s.backdropTap} onPress={dismiss} accessible={false} />
      <View style={[s.card, wide && s.cardWide]} accessibilityRole="alert">
        <Image source={require('../../assets/icon.png')} style={s.icon} />
        <Text style={s.title}>Install KalawGuide</Text>
        <Text style={s.body}>{body}</Text>
        <View style={s.actions}>
          {mode === 'prompt' && (
            <TouchableOpacity style={s.installBtn} onPress={install} accessibilityRole="button" accessibilityLabel="Install KalawGuide">
              <Text style={s.installText}>Install</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.laterBtn} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Not now">
            <Text style={s.laterText}>{mode === 'prompt' ? 'Not now' : 'Got it'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
    alignItems: 'center', justifyContent: 'center', padding: 20,
    backgroundColor: 'rgba(4, 20, 33, 0.55)',
  },
  backdropTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    width: '100%' as any, maxWidth: 380, alignItems: 'center', gap: 10,
    backgroundColor: '#072D4B', borderRadius: 20, padding: 24,
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)' as any,
  },
  cardWide: { maxWidth: 400 },
  icon: { width: 64, height: 64, borderRadius: 16 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  body: { color: '#D6E4EE', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bold: { fontWeight: '700', color: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 },
  installBtn: { backgroundColor: '#22B8C7', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  installText: { color: '#072D4B', fontSize: 15, fontWeight: '700' },
  laterBtn: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  laterText: { color: '#D6E4EE', fontSize: 15, fontWeight: '600' },
});
