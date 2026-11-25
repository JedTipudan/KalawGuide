import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { missingGoogleSetup, type GoogleProfile } from './googleProfile';

WebBrowser.maybeCompleteAuthSession();

export type { GoogleProfile };

/**
 * Website: opens Google's own sign-in popup with KalawGuide's Web client ID. Google sends the user
 * straight back to this website (no third-party auth server in between), so Google's screen shows
 * "continue to KalawGuide" and the site's own address.
 *
 * Returns null when the user closes the Google window. AuthContext.googleSignIn() then creates the
 * account for a new Google user or signs in a returning one.
 */
export async function promptGoogleProfile(): Promise<GoogleProfile | null> {
  const clientId = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim();
  if (!clientId) throw missingGoogleSetup();
  // One fixed address, so it matches "Authorized redirect URIs" in Google Cloud exactly:
  // https://<your-site>/sign-in. That page loads this file, which hands the result back to the opener.
  const redirectUri = `${window.location.origin}/sign-in`;
  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
    // PKCE is only for the "code" flow. Google rejects code_challenge_method on a token request (Error 400).
    usePKCE: false,
    extraParams: { prompt: 'select_account' },
  });
  const result = await request.promptAsync({ authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' });
  if (result.type !== 'success' || !result.authentication?.accessToken) return null;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${result.authentication.accessToken}` },
  });
  if (!res.ok) throw new Error('Could not read your Google profile. Please try again.');
  const info = await res.json();
  return { id: info.sub, email: info.email, name: info.name ?? info.email, picture: info.picture };
}

/** Nothing to clear on the web: the next sign-in shows Google's account chooser. */
export async function signOutGoogle(): Promise<void> {}
