import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawAssistanceFAB } from '../../components/assistant/KalawAssistanceFAB';
import { getDatabase } from '../../database/migrations/init';
import { Typography } from '../../constants/tokens';

interface DestRow {
  id: string; name: string; description: string;
  location: string; cover_image_url: string | null;
  estimated_fee: number | null; fee_verified: number;
}
interface TripRow {
  id: string; title: string; start_date: string; end_date: string;
}

const CATEGORIES = ['Beaches', 'Mountains', 'Nature', 'Food', 'Adventure'];

const PLACEHOLDER_DESTS: DestRow[] = [
  { id: '', name: 'Dahican Beach', description: 'Coastal days, at your pace.', location: 'Mati City, Davao Oriental', cover_image_url: null, estimated_fee: 0, fee_verified: 0 },
  { id: '', name: 'Waniban Island', description: 'Find your island moment.', location: 'Mati City, Davao Oriental', cover_image_url: null, estimated_fee: null, fee_verified: 0 },
  { id: '', name: 'Sleeping Dinosaur', description: 'A different point of view.', location: 'Mati City, Davao Oriental', cover_image_url: null, estimated_fee: null, fee_verified: 0 },
];

const HERO_SLIDES = [
  { src: require('../../assets/images/hero-coast.png'), label: 'Mati Coastline' },
  { src: require('../../assets/images/dest-waniban.png'), label: 'Waniban Island' },
  { src: require('../../assets/images/dest-sleeping-dinosaur.png'), label: 'Sleeping Dinosaur' },
  { src: require('../../assets/images/hero-bg.png'), label: 'Dahican Beach' },
];

export default function WebHomeScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [featured, setFeatured] = useState<DestRow[]>([]);
  const [upcomingTrip, setUpcomingTrip] = useState<TripRow | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<DestRow>(
          'SELECT id, name, description, location, cover_image_url, estimated_fee, fee_verified FROM destinations WHERE is_featured = 1 AND is_active = 1 LIMIT 3'
        );
        setFeatured(rows);
        if (user) {
          const trip = await db.getFirstAsync<TripRow>(
            'SELECT id, title, start_date, end_date FROM itineraries WHERE user_id = ? ORDER BY start_date ASC LIMIT 1',
            [user.id]
          );
          setUpcomingTrip(trip ?? null);
        }
      } catch {}
    })();
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setSlideIndex(i => (i + 1) % HERO_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const firstName = user?.displayName?.split(' ')[0] ?? 'Traveler';
  const displayDests = featured.length > 0 ? featured : PLACEHOLDER_DESTS;

  return (
    <View style={{ flex: 1 }}>
      <WebLayout navVariant="tourist" scrollable={true}>

        {/* ── Travel workspace ── */}
        <View style={[styles.workspace, { backgroundColor: colors.background }]}>

          {/* Eyebrow + headline */}
          <div className="reveal-left">
            <Text style={[styles.eyebrow, { color: colors.accent }]}>YOUR LOCAL TRAVEL COMPANION</Text>
          </div>
          <div className="reveal">
            <Text style={[styles.headline, { color: colors.text }]}>A little further from ordinary.</Text>
          </div>
          <div className="reveal">
            <Text style={[styles.subline, { color: colors.muted }]}>
              Welcome back, {firstName}. Where will your next adventure take you?
            </Text>
          </div>

          {/* ── Hero carousel — all slides stacked, CSS opacity transition ── */}
          <div className="reveal-scale">
            <View style={styles.heroCard}>
              {HERO_SLIDES.map((slide, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: i === slideIndex ? 1 : 0,
                    transition: 'opacity 1s cubic-bezier(0.4,0,0.2,1)',
                  } as any}
                >
                  <Image source={slide.src} style={styles.heroSlideImg} resizeMode="cover" />
                </div>
              ))}
              <View style={styles.heroOverlay} />
              <View style={styles.heroContent}>
                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroTitle}>Less searching. More discovering.</Text>
                  <Text style={styles.heroSub}>Explore the coast, plan a weekend, and make it yours.</Text>
                  <View style={styles.heroRow}>
                    <TouchableOpacity
                      style={[styles.heroCta, { backgroundColor: colors.primary }]}
                      onPress={() => router.push('/(web)/budget' as any)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.heroCtaText}>Plan Your Trip</Text>
                    </TouchableOpacity>
                    <View style={styles.heroDots}>
                      {HERO_SLIDES.map((_, i) => (
                        <TouchableOpacity key={i} onPress={() => setSlideIndex(i)}>
                          <View style={[styles.heroDot, i === slideIndex && styles.heroDotActive]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </div>

          {/* ── Search bar ── */}
          <div className="reveal">
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 16, color: colors.muted }}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search destinations, experiences, and more"
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => router.push('/(web)/explore' as any)}
              />
            </View>
          </div>

          {/* ── Category chips ── */}
          <div className="reveal reveal-group" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 10 } as any}>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat;
              return (
                <div key={cat} className="reveal hover-chip">
                  <TouchableOpacity
                    style={[styles.categoryChip, {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    }]}
                    onPress={() => { setActiveCategory(active ? null : cat); router.push('/(web)/explore' as any); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.categoryChipText, { color: active ? colors.onPrimary : colors.primary }]}>{cat}</Text>
                  </TouchableOpacity>
                </div>
              );
            })}
          </div>

          {/* ── Recommended destinations ── */}
          <div className="reveal">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended for your next escape</Text>
          </div>

          {/* CSS grid — 3 columns, all 3 cards always visible */}
          <div className="dest-grid reveal-group">
            {displayDests.map((d, i) => (
              <div key={d.id || i} className="reveal hover-lift">
                <TouchableOpacity
                  style={[styles.destCard, { backgroundColor: colors.surface }]}
                  onPress={() => d.id ? router.push(`/(web)/destination/${d.id}` as any) : undefined}
                  activeOpacity={0.85}
                >
                  {d.cover_image_url ? (
                    <Image source={{ uri: d.cover_image_url }} style={styles.destImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.destImagePlaceholder, { backgroundColor: colors.subtle }]}>
                      <Text style={{ fontSize: 48 }}>🏝</Text>
                    </View>
                  )}
                  <View style={styles.destInfo}>
                    <Text style={[styles.destLocation, { color: colors.accent }]}>MATI CITY · DAVAO ORIENTAL</Text>
                    <Text style={[styles.destName, { color: colors.text }]}>{d.name}</Text>
                    <Text style={[styles.destDesc, { color: colors.muted }]} numberOfLines={1}>{d.description}</Text>
                    <Text style={[styles.destFeeText, { color: colors.muted }]}>
                      {d.fee_verified ? `Entrance fee: ₱${d.estimated_fee}` : 'Entrance fee: needs verification'}
                    </Text>
                    <Text style={[styles.viewLink, { color: colors.primary }]}>View Details  ↗</Text>
                  </View>
                </TouchableOpacity>
              </div>
            ))}
          </div>

          {/* ── Upcoming trip ── */}
          <div className="reveal hover-lift">
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.infoEyebrow, { color: colors.accent }]}>
                {upcomingTrip ? 'UPCOMING · YOUR TRIP' : 'UPCOMING · EXAMPLE TRIP'}
              </Text>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {upcomingTrip?.title ?? 'Mati coastal weekend'}
              </Text>
              <Text style={[styles.infoSub, { color: colors.muted }]}>
                {upcomingTrip
                  ? `${upcomingTrip.start_date} – ${upcomingTrip.end_date}`
                  : '12–14 June 2027 · 2 travelers · 3 days'}
              </Text>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push('/(web)/trips' as any)}
                activeOpacity={0.85}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Open my itinerary</Text>
              </TouchableOpacity>
            </View>
          </div>

          {/* ── Popular local businesses ── */}
          <div className="reveal hover-lift">
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.infoTitle22, { color: colors.text }]}>Meet your next local favorite</Text>
              <Text style={[styles.infoSub, { color: colors.muted }]}>
                {'Coastal Table · Restaurant & café · Demo listing\nPalm House Stay · Accommodation · Demo listing'}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(web)/businesses' as any)}>
                <Text style={[styles.viewLink, { color: colors.primary }]}>Browse local businesses  ↗</Text>
              </TouchableOpacity>
            </View>
          </div>

          {/* Recently viewed */}
          <div className="reveal">
            <Text style={[styles.recentlyViewed, { color: colors.muted }]}>Recently viewed · Dahican Beach</Text>
          </div>
        </View>

        {/* ── KalawAssistance strip ── */}
        <div className="reveal">
          <View style={[styles.assistStrip, { backgroundColor: colors.subtle }]}>
            <Text style={[styles.assistText, { color: colors.accent }]}>
              ✦ KalawAssistance · Travel help, even offline
            </Text>
          </View>
        </div>

        {/* ── Footer links ── */}
        <View style={[styles.footerLinks, { backgroundColor: colors.background }]}>
          <View style={styles.footerLinkRow}>
            {FOOTER_LINKS.map(l => (
              <TouchableOpacity key={l.label} onPress={() => router.push(l.route as any)}>
                <Text style={[styles.footerLink, { color: colors.muted }]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </WebLayout>
      <KalawAssistanceFAB />
    </View>
  );
}

const FOOTER_LINKS = [
  { label: 'Emergency', route: '/(web)/emergency' },
  { label: 'Profile', route: '/(web)/profile' },
  { label: 'Saved places', route: '/(web)/explore' },
  { label: 'Sign out', route: '/(web)/landing' },
];

const styles = StyleSheet.create({
  workspace: { paddingHorizontal: 64, paddingTop: 40, paddingBottom: 28, gap: 20 },

  eyebrow: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.caption, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },
  headline: { fontFamily: Typography.fontFamilyBody, fontSize: 36, fontWeight: Typography.weight.bold, lineHeight: 52 },
  subline: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, lineHeight: 26 },

  // Hero carousel
  heroCard: { borderRadius: 24, overflow: 'hidden', height: 400, position: 'relative' },
  heroSlideImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%' as any, height: '100%' as any },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6,28,38,0.48)' },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 32 },
  heroTextBlock: { gap: 10 },
  heroTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', lineHeight: 40 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  heroCta: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  heroCtaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  heroDots: { flexDirection: 'row', gap: 8 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  heroDotActive: { backgroundColor: '#FFFFFF', width: 22, borderRadius: 4 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18, borderRadius: 12, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold, outlineStyle: 'none' } as any,

  // Categories
  categoryChip: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderWidth: 1 },
  categoryChipText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.labelLg, fontWeight: Typography.weight.bold },

  sectionTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 24, fontWeight: Typography.weight.bold, lineHeight: 34 },

  // Destination cards — width/flex handled by CSS grid
  destCard: { borderRadius: 18, overflow: 'hidden' },
  destImage: { width: '100%' as any, height: 200 },
  destImagePlaceholder: { width: '100%' as any, height: 200, alignItems: 'center', justifyContent: 'center' },
  destInfo: { padding: 18, paddingTop: 13, gap: 8 },
  destLocation: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.caption, fontWeight: Typography.weight.bold, letterSpacing: 0.3 },
  destName: { fontFamily: Typography.fontFamilyBody, fontSize: 21, fontWeight: Typography.weight.bold, lineHeight: 30 },
  destDesc: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: 22 },
  destFeeText: { fontFamily: Typography.fontFamilyBody, fontSize: 12, lineHeight: 18 },
  viewLink: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, fontWeight: Typography.weight.bold },

  // Info cards
  infoCard: { borderRadius: 18, padding: 24, gap: 14 },
  infoEyebrow: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.caption, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },
  infoTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 24, fontWeight: Typography.weight.bold, lineHeight: 34 },
  infoTitle22: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: Typography.weight.bold, lineHeight: 32 },
  infoSub: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: 22 },
  secondaryBtn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  secondaryBtnText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.bodyLg, fontWeight: Typography.weight.semiBold },

  recentlyViewed: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.body, lineHeight: 22 },

  assistStrip: { paddingHorizontal: 64, paddingVertical: 24 },
  assistText: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.labelLg, fontWeight: Typography.weight.bold },

  footerLinks: { paddingHorizontal: 64, paddingBottom: 28, paddingTop: 20 },
  footerLinkRow: { flexDirection: 'row', gap: 24 },
  footerLink: { fontFamily: Typography.fontFamilyBody, fontSize: 12, lineHeight: 18 },
});
