import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Linking, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface ContactRow {
  id: string; name: string; organization: string;
  contact_number: string; description: string | null; is_verified: number;
}

export default function EmergencyScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  useEffect(() => {
    getDatabase().then(db =>
      db.getAllAsync<ContactRow>(
        'SELECT id, name, organization, contact_number, description, is_verified FROM emergency_contacts ORDER BY is_verified DESC, name ASC'
      )
    ).then(setContacts);
  }, []);

  function callNumber(number: string, name: string) {
    const cleaned = number.replace(/[^0-9+]/g, '');
    Alert.alert(`Call ${name}?`, number, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${cleaned}`) },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Emergency Information</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Local emergency contacts for Mati City, Davao Oriental
        </Text>

        {/* National hotlines — always shown */}
        <View style={[styles.nationalCard, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
          <Text style={[styles.nationalTitle, { color: colors.danger }]}>🚨 National Emergency Hotlines</Text>
          {[
            { label: 'National Emergency Hotline', number: '911' },
            { label: 'Philippine National Police', number: '117' },
            { label: 'Bureau of Fire Protection', number: '160' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.nationalRow}
              onPress={() => callNumber(item.number, item.label)}
              activeOpacity={0.7}
            >
              <Text style={[styles.nationalLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.nationalNumber, { color: colors.danger }]}>{item.number}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.disclaimer, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
          <Text style={[styles.disclaimerText, { color: colors.warning }]}>
            ⚠️ Local contact numbers below are for reference only and may not be current. Always verify numbers locally. In immediate danger, call 911.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Local Contacts — Mati City</Text>

        {contacts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📞</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No local contacts available</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Contact information will be added by the administrator.
            </Text>
          </View>
        ) : (
          contacts.map(contact => (
            <TouchableOpacity
              key={contact.id}
              style={[styles.contactCard, { backgroundColor: colors.surface, ...shadow }]}
              onPress={() => callNumber(contact.contact_number, contact.name)}
              activeOpacity={0.8}
            >
              <View style={styles.contactLeft}>
                <View style={styles.contactHeader}>
                  <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
                    {contact.name}
                  </Text>
                  {contact.is_verified === 1 ? (
                    <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
                      <Text style={[styles.verifiedText, { color: colors.success }]}>✅ Verified</Text>
                    </View>
                  ) : (
                    <View style={[styles.unverifiedBadge, { backgroundColor: colors.warning + '20' }]}>
                      <Text style={[styles.unverifiedText, { color: colors.warning }]}>⚠️ Unverified</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.contactOrg, { color: colors.muted }]}>{contact.organization}</Text>
                {contact.description ? (
                  <Text style={[styles.contactDesc, { color: colors.muted }]} numberOfLines={2}>
                    {contact.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.contactRight}>
                <Text style={[styles.contactNumber, { color: colors.primary }]}>
                  {contact.contact_number}
                </Text>
                <Text style={[styles.callHint, { color: colors.muted }]}>Tap to call</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={[styles.safetyTips, { backgroundColor: colors.subtle }]}>
          <Text style={[styles.safetyTitle, { color: colors.text }]}>🛡 Safety Tips</Text>
          {[
            'Save emergency numbers before your trip.',
            'Know your accommodation\'s full address.',
            'Keep a copy of your ID and passport.',
            'Share your itinerary with someone at home.',
            'Register with your embassy for extended stays.',
          ].map((tip, i) => (
            <Text key={i} style={[styles.safetyTip, { color: colors.muted }]}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  nationalCard: { borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, gap: Spacing.md },
  nationalTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  nationalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  nationalLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, flex: 1 },
  nationalNumber: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  disclaimer: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  disclaimerText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.bold },
  contactCard: { borderRadius: Radius.md, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  contactLeft: { flex: 1, gap: Spacing.xs },
  contactHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  contactName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold, flex: 1 },
  verifiedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  verifiedText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  unverifiedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  unverifiedText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label, fontWeight: Typography.weight.medium },
  contactOrg: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  contactDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  contactRight: { alignItems: 'flex-end', gap: Spacing.xs },
  contactNumber: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.bold },
  callHint: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h5, fontWeight: Typography.weight.semiBold },
  emptySubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, textAlign: 'center', maxWidth: 280 },
  safetyTips: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.sm },
  safetyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  safetyTip: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
});
