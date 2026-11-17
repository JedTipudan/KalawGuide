import { Stack } from 'expo-router';

/**
 * Business owner (mobile): a Stack around 5 bottom tabs, like the tourist and admin apps.
 * Facilities, notifications, photos, products and services are pushed on top of the tabs with a
 * "‹ Back" bar, so Back returns to wherever they were opened from (the old 7-tab bar squeezed every
 * label, and hidden tabs had no way back).
 */
export default function BusinessLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="facilities" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="products" />
      <Stack.Screen name="services" />
    </Stack>
  );
}
