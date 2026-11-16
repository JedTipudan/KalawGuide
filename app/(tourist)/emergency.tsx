import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';
import { KalawAssistanceFAB } from '../../components/assistant/KalawAssistanceFAB';
import { Typography } from '../../constants/tokens';

interface ContactRow {
  id: string; name: string; organization: string;
  contact_number: string; description: string | null; is_verified: number;
}

export default function EmergencyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);

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

  const LOCAL_CATEGORIES = [
    { title: 'Police', icon: '🚔' },
    { title: 'Hospital', icon: '🏥' },
    { title: 'Rescue services', icon: '🚒' },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav bar — mobile only; on web the top WebNav handles navigation */}
      {Platform.OS !== 'web' && (
        <View style={[styles.navBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tourist)/(tabs)/home' as any))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.navTitle, { color: colors.primary }]}>‹ Emergency information</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tourist)/settings' as any)}>
            <Text style={[styles.menuIcon, { color: colors.text }]}>☰</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Emergency information</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Use verified contacts. In immediate danger, contact emergency services.
          </Text>

          {/* National emergency card */}
          <View style={[styles.nationalCard, { backgroundColor: colors.subtle }]}>
            <Text style={[styles.nationalLabel, { color: colors.danger }]}>NATIONAL EMERGENCY</Text>
            <Text style={[styles.nationalNumber, { color: colors.danger }]}>911</Text>
            <Text style={[styles.nationalSubtitle, { color: colors.text }]}>
              Philippines · National emergency hotline
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => callNumber('911', 'National Emergency')}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Call 911</Text>
            </TouchableOpacity>
            <Text style={[styles.sourceText, { color: colors.muted }]}>
              Official source: Emergency 911 National Office{'\n'}
              e911.gov.ph · Published official documentation (2022){'\n'}
              Source reviewed: 03 Nov 2026
            </Text>
          </View>

          {/* Local directory */}
          <View style={styles.localDir}>
            {contacts.length > 0 ? contacts.map(contact => (
              <TouchableOpacity
                key={contact.id}
                style={[styles.localCard, { backgroundColor: colors.surface }]}
                onPress={() => callNumber(contact.contact_number, contact.name)}
                activeOpacity={0.85}
              >
                <Text style={[styles.localCardTitle, { color: colors.text }]}>{contact.name}</Text>
                {contact.is_verified ? (
                  <Text style={[styles.localCardNumber, { color: colors.primary }]}>{contact.contact_number}</Text>
                ) : (
                  <>
                    <Text style={[styles.awaitingText, { color: colors.warning }]}>
                      Local contact awaiting verification
                    </Text>
                    <Text style={[styles.awaitingBody, { color: colors.muted }]}>
                      No unverified number is displayed. Use the national emergency hotline for urgent help.
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )) : LOCAL_CATEGORIES.map(cat => (
              <View key={cat.title} style={[styles.localCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.localCardTitle, { color: colors.text }]}>{cat.title}</Text>
                <Text style={[styles.awaitingText, { color: colors.warning }]}>
                  Local contact awaiting verification
                </Text>
                <Text style={[styles.awaitingBody, { color: colors.muted }]}>
                  No unverified number is displayed. Use the national emergency hotline for urgent help.
                </Text>
              </View>
            ))}
          </View>

          {/* Safety reminders */}
          <View style={[styles.safetyCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.safetyTitle, { color: colors.text }]}>Share your location clearly.</Text>
            <Text style={[styles.safetyBody, { color: colors.muted }]}>
              State your location, the nature of the emergency, and a callback number. Move to a safe place if you can. Do not rely on offline travel content for live emergency conditions.
            </Text>
            <Text style={[styles.safetyWarning, { color: colors.warning }]}>
              Local emergency information: awaiting verified administrator publication.
            </Text>
          </View>
        </View>
      </ScrollView>

      {Platform.OS !== 'web' && <KalawAssistanceFAB />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  navTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  menuIcon: { fontFamily: Typography.fontFamilyBody, fontSize: 22 },
  scroll: { paddingBottom: 100 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 72, gap: 28 },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: 28, fontWeight: Typography.weight.bold },
  subtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 15, marginTop: -20 },
  nationalCard: { borderRadius: 18, padding: 24, gap: 16 },
  nationalLabel: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: Typography.weight.bold },
  nationalNumber: { fontFamily: Typography.fontFamilyBody, fontSize: 64, fontWeight: Typography.weight.bold, lineHeight: 72 },
  nationalSubtitle: { fontFamily: Typography.fontFamilyBody, fontSize: 18, fontWeight: Typography.weight.bold },
  primaryBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: 14, fontWeight: Typography.weight.semiBold },
  sourceText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, lineHeight: 18 },
  localDir: { gap: 20 },
  localCard: { borderRadius: 18, padding: 24, gap: 16 },
  localCardTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  localCardNumber: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  awaitingText: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  awaitingBody: { fontFamily: Typography.fontFamilyBody, fontSize: 14 },
  safetyCard: { borderRadius: 18, padding: 24, gap: 14 },
  safetyTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold },
  safetyBody: { fontFamily: Typography.fontFamilyBody, fontSize: 15 },
  safetyWarning: { fontFamily: Typography.fontFamilyBody, fontSize: 13 },
});
