import { Stack } from 'expo-router';

const hidden = { headerShown: false } as const;

export default function WebGroupLayout() {
  return (
    <Stack>
      <Stack.Screen name="landing" options={hidden} />
      <Stack.Screen name="sign-in" options={hidden} />
      <Stack.Screen name="register-tourist" options={hidden} />
      <Stack.Screen name="register-business" options={hidden} />
      <Stack.Screen name="forgot-password" options={hidden} />
      <Stack.Screen name="role-select" options={hidden} />
      <Stack.Screen name="home" options={hidden} />
      <Stack.Screen name="explore" options={hidden} />
      <Stack.Screen name="destination/[id]" options={hidden} />
      <Stack.Screen name="businesses" options={hidden} />
      <Stack.Screen name="budget" options={hidden} />
      <Stack.Screen name="budget-results" options={hidden} />
      <Stack.Screen name="trips" options={hidden} />
      <Stack.Screen name="expenses" options={hidden} />
      <Stack.Screen name="add-expense" options={hidden} />
      <Stack.Screen name="my-budgets" options={hidden} />
      <Stack.Screen name="booking-history" options={hidden} />
      <Stack.Screen name="emergency" options={hidden} />
      <Stack.Screen name="profile" options={hidden} />
      <Stack.Screen name="settings" options={hidden} />
      <Stack.Screen name="recommendations" options={hidden} />
      <Stack.Screen name="business-dashboard" options={hidden} />
      <Stack.Screen name="business-profile" options={hidden} />
      <Stack.Screen name="business-products" options={hidden} />
      <Stack.Screen name="business-prices" options={hidden} />
      <Stack.Screen name="business-facilities" options={hidden} />
      <Stack.Screen name="business-bookings" options={hidden} />
      <Stack.Screen name="business-notifications" options={hidden} />
      <Stack.Screen name="business-settings" options={hidden} />
      <Stack.Screen name="admin-dashboard" options={hidden} />
      <Stack.Screen name="admin-users" options={hidden} />
      <Stack.Screen name="admin-businesses" options={hidden} />
      <Stack.Screen name="admin-destinations" options={hidden} />
      <Stack.Screen name="admin-emergency" options={hidden} />
      <Stack.Screen name="admin-reports" options={hidden} />
      <Stack.Screen name="admin-activity-logs" options={hidden} />
      <Stack.Screen name="admin-settings" options={hidden} />
    </Stack>
  );
}
