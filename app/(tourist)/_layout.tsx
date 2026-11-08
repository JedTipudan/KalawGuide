import { Stack } from 'expo-router';

export default function TouristLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="destination/[id]" />
      <Stack.Screen name="business/[id]" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="budget-results" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="add-expense" />
      <Stack.Screen name="itinerary/[id]" />
      <Stack.Screen name="emergency" />
      <Stack.Screen name="my-budgets" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="booking-history" />
      <Stack.Screen name="booking-submitted" />
      <Stack.Screen name="booking/[businessId]" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="recommendations" />
    </Stack>
  );
}
