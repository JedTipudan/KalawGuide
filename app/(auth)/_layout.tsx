import { Stack } from 'expo-router';

const hidden = { headerShown: false, animation: 'fade' } as const;

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={hidden} />
      <Stack.Screen name="onboarding" options={hidden} />
      <Stack.Screen name="sign-in" options={hidden} />
      <Stack.Screen name="register-tourist" options={hidden} />
      <Stack.Screen name="register-business" options={hidden} />
      <Stack.Screen name="forgot-password" options={hidden} />
      <Stack.Screen name="verification-pending" options={hidden} />
      <Stack.Screen name="role-select" options={hidden} />
    </Stack>
  );
}
