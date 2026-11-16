import { Stack } from 'expo-router';

/**
 * Admin (mobile): a Stack around the bottom tabs, like the tourist app.
 * Detail screens (categories, reports, activity logs, emergency contacts) are pushed on top of the
 * tabs, so Back returns to wherever they were opened from.
 */
export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="activity-logs" />
      <Stack.Screen name="emergency-contacts" />
    </Stack>
  );
}
