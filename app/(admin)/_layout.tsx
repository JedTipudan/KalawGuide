import { Tabs } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../constants/tokens';

export default function AdminLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: Typography.fontFamilyBody,
          fontSize: Typography.size.label,
          fontWeight: Typography.weight.medium,
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text> }} />
      <Tabs.Screen name="businesses" options={{ title: 'Businesses', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏪</Text> }} />
      <Tabs.Screen name="destinations" options={{ title: 'Destinations', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺</Text> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text> }} />
      {/* Hidden screens */}
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="activity-logs" options={{ href: null }} />
      <Tabs.Screen name="bookings" options={{ href: null }} />
    </Tabs>
  );
}
