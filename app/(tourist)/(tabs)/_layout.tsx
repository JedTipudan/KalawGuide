import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { Typography } from '../../../constants/tokens';
import { Icon } from '../../../components/common/Icon';

function TabIcon({ name, label, focused, color }: { name: string; label: string; focused: boolean; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabItem, focused && { backgroundColor: colors.subtle, borderRadius: 8 }]}>
      <Icon name={name as any} size={24} color={focused ? colors.primary : colors.onNavigation} />
      <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.onNavigation }]}>{label}</Text>
    </View>
  );
}

export default function TouristTabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 66 + insets.bottom,
          paddingTop: 18,
          paddingBottom: 24 + insets.bottom,
          paddingHorizontal: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="home" label="Home" focused={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="explore" label="Explore" focused={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="trips"
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="trips" label="My Trips" focused={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="businesses"
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="businesses" label="Businesses" focused={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="favorites" label="Favorites" focused={focused} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused, color }) => <TabIcon name="profile" label="Profile" focused={focused} color={color} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, paddingHorizontal: 0, gap: 6, minWidth: 48,
  },
  tabLabel: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
});
