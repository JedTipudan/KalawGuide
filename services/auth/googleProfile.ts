export interface GoogleProfile { id: string; email: string; name: string; picture?: string }

export function missingGoogleSetup(): Error {
  return new Error('Google sign-in is not set up yet. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID (see guide.html → Google Sign-In), or use email and password.');
}
