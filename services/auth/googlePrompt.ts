import { missingGoogleSetup, type GoogleProfile } from './googleProfile';

export type { GoogleProfile };

/**
 * Phones (APK / iOS): the native Google account picker from Google Play services. No browser and
 * no third-party auth server, so the user only sees "KalawGuide" and their Google accounts.
 *
 * Google matches the app by its Android OAuth client (package com.kalawguide.app + the APK's SHA-1);
 * webClientId is the Web client ID from the same Google Cloud project.
 * Needs a development or EAS build — it is not in Expo Go.
 *
 * Returns null when the user closes the picker.
 */
type Lib = typeof import('@react-native-google-signin/google-signin');
let lib: Lib | null = null;

/** Loaded on first use: the native module is not in Expo Go, and importing it there would crash the screen. */
async function load(): Promise<Lib> {
  if (lib) return lib;
  const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim();
  if (!webClientId) throw missingGoogleSetup();
  const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim() || undefined;
  let mod: Lib;
  try {
    mod = await import('@react-native-google-signin/google-signin');
  } catch {
    throw new Error('Google sign-in needs the installed app (APK). It is not available in Expo Go.');
  }
  mod.GoogleSignin.configure({ webClientId, iosClientId, scopes: ['profile', 'email'] });
  lib = mod;
  return mod;
}

export async function promptGoogleProfile(): Promise<GoogleProfile | null> {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await load();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const u = response.data.user;
    return { id: u.id, email: u.email, name: u.name ?? u.email, picture: u.photo ?? undefined };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play services is missing or out of date on this phone. Update it, or sign in with email.');
      }
      if (String(e.code) === '10' || /DEVELOPER_ERROR/i.test(e.message)) {
        throw new Error('Google sign-in is not set up for this build (DEVELOPER_ERROR). Add this APK\'s SHA-1 to the Android OAuth client — see guide.html → Google Sign-In.');
      }
    }
    throw e;
  }
}

export function hasGoogleRedirect(): boolean {
  return false;
}

/** Website only (redirect sign-in). On phones the picker returns the profile directly. */
export async function completeGoogleRedirect(): Promise<GoogleProfile | null> {
  return null;
}

/** Forget the Google account on this phone, so the next sign-in shows the account picker again. */
export async function signOutGoogle(): Promise<void> {
  try {
    if ((process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim()) await (await load()).GoogleSignin.signOut();
  } catch {
    /* not signed in with Google */
  }
}
