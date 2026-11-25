import { missingGoogleSetup, type GoogleProfile } from './googleProfile';

export type { GoogleProfile };

/**
 * Website: full-page redirect to Google (no popup). The site sends
 * Cross-Origin-Opener-Policy: same-origin (needed by the on-device database), which cuts a popup
 * off from the page that opened it, so a popup could never hand the result back.
 *
 * 1. promptGoogleProfile() sends this tab to Google with KalawGuide's Web client ID.
 * 2. Google sends it back to https://<site>/sign-in#access_token=…
 * 3. The sign-in page calls completeGoogleRedirect(), which reads the token, gets the profile,
 *    and AuthContext.googleSignIn() signs in (or creates the account).
 *
 * "Authorized redirect URIs" in Google Cloud must contain exactly https://<site>/sign-in.
 */

const STATE_KEY = 'kalaw.google.state';
/** Written by index.ts at startup: Google's #reply, saved before the router rewrites the URL. */
const RETURN_KEY = 'kalaw.google.return';

/** True when this page load is Google sending the user back. */
export function hasGoogleRedirect(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem(RETURN_KEY);
  } catch {
    return false;
  }
}

function redirectUri(): string {
  return `${window.location.origin}/sign-in`;
}

/** Leaves the page for Google. The returned promise never resolves: the tab navigates away. */
export async function promptGoogleProfile(): Promise<GoogleProfile | null> {
  const clientId = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim();
  if (!clientId) throw missingGoogleSetup();
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: 'openid profile email',
    prompt: 'select_account',
    state,
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  return new Promise<GoogleProfile | null>(() => {});
}

/**
 * Call once when the sign-in page opens. Returns the Google profile when the page was opened by
 * Google's redirect, null otherwise. Throws when Google reported an error or the state is wrong.
 */
export async function completeGoogleRedirect(): Promise<GoogleProfile | null> {
  if (typeof window === 'undefined') return null;
  const saved = sessionStorage.getItem(RETURN_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  if (!saved) return null;
  const hash = new URLSearchParams(saved);
  const token = hash.get('access_token');
  const error = hash.get('error');
  if (!token && !error) return null;

  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);

  if (error) {
    if (error === 'access_denied') return null; // user pressed Cancel at Google
    throw new Error(`Google sign-in failed (${error}). Please try again.`);
  }
  if (!expected || hash.get('state') !== expected) {
    throw new Error('Google sign-in could not be verified. Please try again.');
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Could not read your Google profile. Please try again.');
  const info = await res.json();
  return { id: info.sub, email: info.email, name: info.name ?? info.email, picture: info.picture };
}

/** Nothing to clear on the web: the next sign-in shows Google's account chooser. */
export async function signOutGoogle(): Promise<void> {}
