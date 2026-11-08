import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { WebNav } from './WebNav';
import { Typography, Spacing } from '../../constants/tokens';

interface WebLayoutProps {
  children: React.ReactNode;
  navVariant?: 'public' | 'tourist' | 'business' | 'admin';
  scrollable?: boolean;
}

export function WebLayout({ children, navVariant = 'public', scrollable = true }: WebLayoutProps) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <WebNav variant={navVariant} />
      <View style={styles.body}>{children}</View>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.muted }]}>
          KalawGuide · Privacy Policy · Terms and Conditions
        </Text>
      </View>
    </View>
  );

  if (!scrollable) return content;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: { flex: 1, minHeight: '100%' as any },
  body: { flex: 1 },
  footer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: 64,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.label,
  },
});
