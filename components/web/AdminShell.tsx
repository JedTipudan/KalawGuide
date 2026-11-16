import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { rw } from '../../utils/responsive';

const SIDEBAR_LINKS = [
  { label: 'Dashboard', route: '/(web)/admin-dashboard' },
  { label: 'User Management', route: '/(web)/admin-users' },
  { label: 'Business Verification', route: '/(web)/admin-businesses' },
  { label: 'Destination Management', route: '/(web)/admin-destinations' },
  { label: 'Emergency Contacts', route: '/(web)/admin-emergency' },
  { label: 'Reports & Analytics', route: '/(web)/admin-reports' },
  { label: 'Activity Logs', route: '/(web)/admin-activity-logs' },
  { label: 'System Settings', route: '/(web)/admin-settings' },
  { label: 'Logout', route: null },
];

interface Props { children: React.ReactNode; activeLabel?: string; }

export function AdminShell({ children, activeLabel }: Props) {
  const { colors, isDark, mode, setMode } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState<string | null>(null);

  const themeLabel = mode === 'light' ? '☀ Light' : mode === 'dark' ? '☾ Dark' : '◐ System';
  function cycleTheme() {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  }

  function isActive(link: typeof SIDEBAR_LINKS[0]) {
    if (activeLabel) return link.label === activeLabel;
    if (selected) return link.label === selected;
    if (!link.route) return false;
    const clean = link.route.replace('/(web)', '');
    return pathname === clean || pathname === link.route;
  }

  // Figma light: white "Navigation" surfaces, #1F2937 nav text, active item filled with primary.
  // Dark keeps the deep navy (sand) navigation.
  const navBg = isDark ? colors.sand : colors.surface;
  const navText = isDark ? colors.muted : colors.text;
  const activeBg = isDark ? colors.subtle : colors.primary;
  const activeText = isDark ? colors.text : colors.onPrimary;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View {...rw('pad wrap')} style={[s.commandBar, { backgroundColor: navBg, borderBottomColor: colors.border }]}>
        <Text style={[s.logo, { color: colors.primary }]}>≋ KalawGuide</Text>
        <Text {...rw('hide-sm')} style={[s.barLabel, { color: colors.muted }]}>CONTROL CENTER / ADMINISTRATOR</Text>
        <TouchableOpacity style={[s.themeBtn, { backgroundColor: isDark ? colors.subtle : colors.surface, borderColor: colors.border }]} onPress={cycleTheme}>
          <Text style={[s.themeBtnText, { color: colors.text }]}>{themeLabel}</Text>
        </TouchableOpacity>
      </View>
      <View {...rw('stack')} style={s.shell}>
        <View {...rw('sidebar')} style={[s.sidebar, { backgroundColor: navBg, borderRightColor: colors.border }]}>
          <Text {...rw('hide-sm')} style={[s.sidebarSection, { color: navText }]}>PLATFORM MANAGEMENT</Text>
          {SIDEBAR_LINKS.map(link => (
            <TouchableOpacity
              key={link.label}
              style={[s.item, isActive(link) && { backgroundColor: activeBg }]}
              onPress={() => {
                if (!link.route) { signOut(); return; }
                setSelected(link.label);
                router.push(link.route as any);
              }}
            >
              <Text style={[s.itemText, { color: isActive(link) ? activeText : navText }, isActive(link) && s.itemTextActive]}>{link.label}</Text>
            </TouchableOpacity>
          ))}
          <Text {...rw('hide-sm')} style={[s.sidebarFooter, { color: navText }]}>{'Administrator access\nRestricted workspace'}</Text>
        </View>
        <ScrollView style={s.workspace} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  commandBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 16, borderBottomWidth: 1, gap: 16 },
  logo: { fontSize: 20, fontWeight: '700', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' } as any,
  barLabel: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  themeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  themeBtnText: { fontSize: 13, fontWeight: '600' },
  shell: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 220, borderRightWidth: 1, paddingHorizontal: 16, paddingVertical: 28, gap: 2 },
  sidebarSection: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, opacity: 0.7 },
  item: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 },
  itemText: { fontSize: 12 },
  itemTextActive: { fontWeight: '700' },
  sidebarFooter: { fontSize: 11, opacity: 0.7, marginTop: 16, lineHeight: 16 },
  workspace: { flex: 1 },
});
