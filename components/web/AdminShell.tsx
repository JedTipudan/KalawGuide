import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

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
  const { colors, mode, setMode } = useTheme();
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

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={s.commandBar}>
        <Text style={s.logo}>≋ KalawGuide</Text>
        <Text style={s.barLabel}>CONTROL CENTER / ADMINISTRATOR</Text>
        <TouchableOpacity style={s.themeBtn} onPress={cycleTheme}>
          <Text style={s.themeBtnText}>{themeLabel}</Text>
        </TouchableOpacity>
      </View>
      <View style={s.shell}>
        <View style={s.sidebar}>
          <Text style={s.sidebarSection}>PLATFORM MANAGEMENT</Text>
          {SIDEBAR_LINKS.map(link => (
            <TouchableOpacity
              key={link.label}
              style={[s.item, isActive(link) && s.itemActive]}
              onPress={() => {
                if (!link.route) { signOut(); return; }
                setSelected(link.label);
                router.push(link.route as any);
              }}
            >
              <Text style={[s.itemText, isActive(link) && s.itemTextActive]}>{link.label}</Text>
            </TouchableOpacity>
          ))}
          <Text style={s.sidebarFooter}>{'Administrator access\nRestricted workspace'}</Text>
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
  commandBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 16, borderBottomWidth: 1, gap: 16, backgroundColor: '#0B2633' },
  logo: { fontSize: 20, fontWeight: '700', color: '#6ED8DF', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' } as any,
  barLabel: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#ACC1C8' },
  themeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#2A4050', backgroundColor: '#1A3040' },
  themeBtnText: { fontSize: 13, fontWeight: '600', color: '#E8F0F3' },
  shell: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 220, backgroundColor: '#0B2633', paddingHorizontal: 16, paddingVertical: 28, gap: 2 },
  sidebarSection: { color: '#DEF0F5', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8, opacity: 0.7 },
  item: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 },
  itemActive: { backgroundColor: '#14616E' },
  itemText: { color: '#DEF0F5', fontSize: 12, opacity: 0.8 },
  itemTextActive: { fontWeight: '700', opacity: 1 },
  sidebarFooter: { color: '#DEF0F5', fontSize: 11, opacity: 0.5, marginTop: 16, lineHeight: 16 },
  workspace: { flex: 1 },
});
