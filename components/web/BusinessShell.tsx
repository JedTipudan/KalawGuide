import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDatabase } from '../../database/migrations/init';

const SIDEBAR_LINKS = [
  { label: 'Dashboard', route: '/(web)/business-dashboard' },
  { label: 'My Business Profile', route: '/(web)/business-profile' },
  { label: 'Products & Services', route: '/(web)/business-products' },
  { label: 'Price Management', route: '/(web)/business-prices' },
  { label: 'Facilities & Activities', route: '/(web)/business-facilities' },
  { label: 'Notifications', route: '/(web)/business-notifications' },
  { label: 'Account Settings', route: '/(web)/business-settings' },
  { label: 'Logout', route: null },
];

interface Props { children: React.ReactNode; activeLabel?: string; }

export function BusinessShell({ children, activeLabel }: Props) {
  const { colors, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState<string | null>(null);
  const [bizName, setBizName] = useState<string | null>(null);
  const [bizStatus, setBizStatus] = useState<string>('not_submitted');

  useEffect(() => {
    if (!user) return;
    getDatabase().then(db =>
      db.getFirstAsync<{ name: string; verification_status: string }>(
        'SELECT name, verification_status FROM businesses WHERE owner_id = ? LIMIT 1',
        [user.id]
      )
    ).then(row => {
      if (row) { setBizName(row.name); setBizStatus(row.verification_status); }
    }).catch(() => {});
  }, [user]);

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

  const STATUS_COLOR: Record<string, string> = {
    not_submitted: colors.muted, pending: '#956112',
    approved: '#197151', rejected: '#AC3545', suspended: '#AC3545',
  };
  const STATUS_DOT: Record<string, string> = {
    not_submitted: '⚪', pending: '🟡', approved: '🟢', rejected: '🔴', suspended: '🔴',
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Command bar */}
      <View style={[s.commandBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.logo, { color: colors.primary }]}>≋ KalawGuide</Text>
        <Text style={[s.barLabel, { color: colors.muted }]}>BUSINESS WORKSPACE</Text>
        <TouchableOpacity style={[s.themeBtn, { backgroundColor: colors.subtle, borderColor: colors.border }]} onPress={cycleTheme}>
          <Text style={[s.themeBtnText, { color: colors.text }]}>{themeLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.shell}>
        {/* Sidebar */}
        <View style={[s.sidebar, { backgroundColor: colors.subtle, borderRightColor: colors.border, overflow: 'auto' as any }]}>
          <Text style={[s.sidebarRole, { color: colors.accent }]}>BUSINESS OWNER</Text>

          {bizName && (
            <View style={[s.bizCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.bizCardName, { color: colors.text }]} numberOfLines={2}>{bizName}</Text>
              <Text style={[s.bizCardStatus, { color: STATUS_COLOR[bizStatus] }]}>
                {STATUS_DOT[bizStatus]} {bizStatus.replace('_', ' ')}
              </Text>
            </View>
          )}

          {SIDEBAR_LINKS.map(link => (
            <TouchableOpacity
              key={link.label}
              style={[s.item, isActive(link) && { backgroundColor: colors.border }]}
              onPress={() => {
                if (!link.route) { signOut(); return; }
                setSelected(link.label);
                router.push(link.route as any);
              }}
            >
              <Text style={[s.itemText, { color: isActive(link) ? colors.primary : colors.text }, isActive(link) && s.itemTextActive]}>
                {link.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={[s.sidebarFooter, { color: colors.muted }]}>{'Only your business records\nare visible in this portal.'}</Text>
        </View>

        {/* Workspace */}
        <ScrollView style={s.workspace} contentContainerStyle={s.workspaceContent} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, height: '100vh' as any, overflow: 'hidden' as any, flexDirection: 'column' },
  commandBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 16, borderBottomWidth: 1, gap: 16 },
  logo: { fontSize: 20, fontWeight: '700' },
  barLabel: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  themeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  themeBtnText: { fontSize: 13, fontWeight: '600' },
  shell: { flex: 1, flexDirection: 'row', overflow: 'hidden' as any, width: '100%' as any },
  sidebar: { width: 220, maxWidth: 220, minWidth: 220, borderRightWidth: 1, flexShrink: 0, flexGrow: 0, paddingHorizontal: 14, paddingVertical: 16, gap: 1 },
  sidebarRole: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  bizCard: { borderRadius: 10, padding: 10, gap: 4, marginBottom: 6 },
  bizCardName: { fontSize: 13, fontWeight: '700' },
  bizCardStatus: { fontSize: 11, textTransform: 'capitalize' },
  item: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6 },
  itemText: { fontSize: 13 },
  itemTextActive: { fontWeight: '700' },
  sidebarFooter: { fontSize: 11, opacity: 0.6, marginTop: 16, lineHeight: 16 },
  workspace: { flex: 1 },
  workspaceContent: { flexGrow: 1 },
});
