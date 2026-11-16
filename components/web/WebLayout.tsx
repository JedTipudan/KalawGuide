import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { WebNav } from './WebNav';
import { Typography, Spacing } from '../../constants/tokens';
import { rw } from '../../utils/responsive';

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
      <div className="page-enter" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <View style={styles.body}>{children}</View>
      </div>
      <View {...rw('pad')} style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.muted }]}>
          KalawGuide · Privacy Policy · Terms and Conditions
        </Text>
      </View>
    </View>
  );

  // Pages that scroll themselves need a viewport-bounded parent on web
  if (!scrollable) return <View style={styles.fixedViewport}>{content}</View>;

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
  fixedViewport: { height: '100vh' as any, overflow: 'hidden' },
  scrollContent: { flexGrow: 1, minHeight: '100vh' as any },
  page: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0 },
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
