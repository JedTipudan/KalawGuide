import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants/tokens';
import { ActivityLogView } from '../../components/admin/ActivityLogView';

export default function AdminActivityLogsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/settings' as any))} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.barTitle, { color: colors.primary }]}>‹ Activity logs</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary}
          onRefresh={() => { setRefreshing(true); setRefreshKey(k => k + 1); setTimeout(() => setRefreshing(false), 400); }} />}
      >
        <Text style={[styles.subtitle, { color: colors.muted }]}>Who did what, and when, across KalawGuide.</Text>
        <ActivityLogView refreshKey={refreshKey} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  barTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 20, fontWeight: Typography.weight.bold },
  content: { padding: Spacing.base, gap: Spacing.base, paddingBottom: 100 },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
});
