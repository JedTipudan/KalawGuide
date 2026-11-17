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

  // Scrolling pages must not let the body shrink below its content (minHeight: 0); otherwise on
  // short screens it got squeezed to the window height and the page ran underneath the footer.
  // Fixed-viewport pages scroll inside the body, so there it must be allowed to shrink.
  const content = (
    <View style={[styles.page, scrollable && styles.grow, { backgroundColor: colors.background }]}>
      <WebNav variant={navVariant} />
      <div className="page-enter" style={{ flex: scrollable ? '1 0 auto' : 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <View style={[styles.body, scrollable && styles.grow]}>{children}</View>
      </div>
      <View {...rw(scrollable ? 'pad' : 'pad hide-sm')} style={[styles.footer, { borderTopColor: colors.border }]}>
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
  grow: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' as any, minHeight: 'auto' as any },
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
