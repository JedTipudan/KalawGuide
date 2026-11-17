import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/tokens';

/**
 * "‹ Title" bar for mobile screens pushed on top of the tabs (business owner and admin).
 * Goes back to wherever the screen was opened from, or to `fallback` if there is no history
 * (e.g. after a reload).
 */
export function BackBar({ title, fallback }: { title: string; fallback: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as any))}
        accessibilityRole="button"
        accessibilityLabel={`Go back from ${title}`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.title, { color: colors.primary }]}>‹ {title}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: '700' },
});
