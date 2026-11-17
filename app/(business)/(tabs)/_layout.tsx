import { Tabs } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../../constants/tokens';

export default function BusinessTabsLayout() {
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
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: () => <TabIcon icon="📊" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'My Business', tabBarIcon: () => <TabIcon icon="🏪" /> }} />
      <Tabs.Screen name="listings" options={{ title: 'Listings', tabBarIcon: () => <TabIcon icon="📋" /> }} />
      <Tabs.Screen name="prices" options={{ title: 'Prices', tabBarIcon: () => <TabIcon icon="💰" /> }} />
      <Tabs.Screen name="account-settings" options={{ title: 'Account', tabBarIcon: () => <TabIcon icon="⚙️" /> }} />
    </Tabs>
  );
}

function TabIcon({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
