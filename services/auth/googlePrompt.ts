import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleProfile { id: string; email: string; name: string; picture?: string }

/**
 * Asks Google who the user is. One flow for sign-in and registration: AuthContext.googleSignIn()
 * creates the account for a new Google user and signs in a returning one.
 *
 * - No EXPO_PUBLIC_GOOGLE_CLIENT_ID → demo mode (a simulated Google user), so the button always works in demos.
 * - Returns null when the user closes the Google window.
 */
export async function promptGoogleProfile(): Promise<GoogleProfile | null> {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
  if (!clientId) {
    return { id: 'google_demo_user', email: 'demo.google@kalawguide.app', name: 'Google Demo User' };
  }
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'kalawguide' });
  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
  });
  const result = await request.promptAsync({ authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' });
  if (result.type !== 'success' || !result.authentication?.accessToken) return null;
  const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${result.authentication.accessToken}`);
  if (!res.ok) throw new Error('Could not read your Google profile. Please try again.');
  const info = await res.json();
  return { id: info.sub, email: info.email, name: info.name, picture: info.picture };
}
