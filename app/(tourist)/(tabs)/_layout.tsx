import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { Typography } from '../../../constants/tokens';
import { Icon } from '../../../components/common/Icon';

export default function TouristTabsLayout() {
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
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <Icon name="home" size={22} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <Icon name="explore" size={22} color={color} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'My Trips', tabBarIcon: ({ color }) => <Icon name="trips" size={22} color={color} /> }} />
      <Tabs.Screen name="businesses" options={{ title: 'Businesses', tabBarIcon: ({ color }) => <Icon name="businesses" size={22} color={color} /> }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarIcon: ({ color }) => <Icon name="favorites" size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Icon name="profile" size={22} color={color} /> }} />
    </Tabs>
  );
}


