import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { KalawButton } from '../../../components/common/KalawButton';
import { KalawInput } from '../../../components/common/KalawInput';
import { getDatabase } from '../../../database/migrations/init';
import { generateId, now, formatCurrency } from '../../../utils/helpers';
import { Typography, Spacing, Radius, Shadows } from '../../../constants/tokens';

interface ServiceRow { id: string; name: string; price: number; duration: string | null; }
interface BizRow { id: string; name: string; }

export default function BookingScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const [biz, setBiz] = useState<BizRow | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  useEffect(() => {
    if (!businessId) return;
    async function load() {
      const db = await getDatabase();
      const b = await db.getFirstAsync<BizRow>('SELECT id, name FROM businesses WHERE id = ?', [businessId]);
      if (b) setBiz(b);
      const svcs = await db.getAllAsync<ServiceRow>(
        'SELECT id, name, price, duration FROM business_services WHERE business_id = ? AND is_available = 1 ORDER BY name',
        [businessId]
      );
      setServices(svcs);
      if (svcs.length > 0) setSelectedService(svcs[0].id);
    }
    load();
  }, [businessId]);

  function validate() {
    const e: Record<string, string> = {};
    if (!selectedService) e.service = 'Please select a service.';
    if (guestCount && (isNaN(Number(guestCount)) || Number(guestCount) < 1)) e.guestCount = 'Enter a valid number of guests.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || !user || !businessId) return;
    setSubmitting(true);
    try {
      const db = await getDatabase();
      const id = generateId();
      await db.runAsync(
        `INSERT INTO booking_requests (id, tourist_id, business_id, service_id, requested_date, guest_count, notes, status, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 'local_only')`,
        [
          id, user.id, businessId, selectedService,
          requestedDate.trim() || null,
          guestCount.trim() ? Number(guestCount) : null,
          notes.trim() || null,
          now(), now(),
        ]
      );
      router.replace({
        pathname: '/(tourist)/booking-submitted' as any,
        params: {
          businessName: biz?.name ?? '',
          serviceName: selectedSvc?.name ?? '',
          date: requestedDate.trim() || '',
          guests: guestCount.trim() || '1',
        },
      });
    } catch (e) {
      Alert.alert('Error', 'Could not submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!biz) return null;

  const selectedSvc = services.find(s => s.id === selectedService);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Request a Booking</Text>
          <Text style={[styles.bizName, { color: colors.muted }]}>📍 {biz.name}</Text>

          <View style={[styles.pendingNote, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
            <Text style={[styles.pendingNoteText, { color: colors.warning }]}>
              ⏳ Booking requests are pending until the business owner approves them. This is not a confirmed reservation.
            </Text>
          </View>

          {/* Service selection */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Select Service *</Text>
            {errors.service && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.service}</Text>}
            {services.map(svc => (
              <TouchableOpacity
                key={svc.id}
                style={[
                  styles.serviceOption,
                  {
                    backgroundColor: selectedService === svc.id ? colors.primary + '15' : colors.surface,
                    borderColor: selectedService === svc.id ? colors.primary : colors.border,
                    ...shadow,
                  },
                ]}
                onPress={() => setSelectedService(svc.id)}
                activeOpacity={0.8}
              >
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, { color: colors.text }]}>{svc.name}</Text>
                  {svc.duration && <Text style={[styles.serviceDuration, { color: colors.muted }]}>⏱ {svc.duration}</Text>}
                </View>
                <View style={styles.serviceRight}>
                  <Text style={[styles.servicePrice, { color: colors.primary }]}>{formatCurrency(svc.price)}</Text>
                  {selectedService === svc.id && (
                    <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <KalawInput
            label="Requested Date"
            placeholder="YYYY-MM-DD (optional)"
            value={requestedDate}
            onChangeText={setRequestedDate}
            hint="Leave blank if flexible"
          />

          <KalawInput
            label="Number of Guests"
            placeholder="1"
            value={guestCount}
            onChangeText={setGuestCount}
            keyboardType="number-pad"
            error={errors.guestCount}
          />

          <KalawInput
            label="Notes"
            placeholder="Any special requests or questions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />

          {selectedSvc && (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, ...shadow }]}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Service</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedSvc.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Price</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatCurrency(selectedSvc.price)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Status after submit</Text>
                <Text style={[styles.summaryValue, { color: colors.warning }]}>⏳ Pending</Text>
              </View>
            </View>
          )}

          <KalawButton label="Submit Booking Request" onPress={handleSubmit} loading={submitting} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.xs },
  backText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  title: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.h4, fontWeight: Typography.weight.bold },
  bizName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg },
  pendingNote: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  pendingNoteText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: Typography.size.body * Typography.lineHeight },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
  errorText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  serviceOption: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1.5, gap: Spacing.md },
  serviceInfo: { flex: 1, gap: Spacing.xs },
  serviceName: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },
  serviceDuration: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  serviceRight: { alignItems: 'flex-end', gap: Spacing.xs },
  servicePrice: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  selectedDot: { width: 10, height: 10, borderRadius: 5 },
  summaryCard: { borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md },
  summaryTitle: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.bold },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body },
  summaryValue: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.medium },
});
