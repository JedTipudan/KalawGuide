import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';

const HERO_BG = require('../../assets/images/hero-bg.png');

export default function WebLandingScreen() {
  const { colors, mode, setMode } = useTheme();
  const router = useRouter();
  const [destinations, setDestinations] = useState<{ id: string; name: string; location: string; estimated_fee: number | null }[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getDatabase().then(db =>
      db.getAllAsync<{ id: string; name: string; location: string; estimated_fee: number | null }>(
        'SELECT id, name, location, estimated_fee FROM destinations WHERE is_featured = 1 AND is_active = 1 LIMIT 3'
      )
    ).then(setDestinations).catch(() => {});
  }, []);

  const themeLabel = mode === 'light' ? '☀ Light' : mode === 'dark' ? '☾ Dark' : '◐ System';
  function cycleTheme() {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  }

  const featuredDests = destinations.length > 0 ? destinations : PLACEHOLDER_DESTS;

  return (
    <ScrollView style={[s.root, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* ── Navigation ── */}
      <View style={[s.nav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.navLogo, { color: colors.primary }]}>≋  KalawGuide</Text>
        <View style={s.navLinks}>
          {['Home', 'Explore Destinations', 'Local Businesses', 'About'].map(l => (
            <TouchableOpacity key={l} onPress={() => l === 'Explore Destinations' ? router.push('/(web)/explore' as any) : undefined}>
              <Text style={[s.navLink, { color: colors.muted }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.navRight}>
          <TouchableOpacity style={[s.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={cycleTheme}>
            <Text style={[s.navBtnText, { color: colors.text }]}>{themeLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(web)/sign-in' as any)}>
            <Text style={[s.navBtnText, { color: colors.text }]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.navBtnPrimary, { backgroundColor: colors.primary }]} onPress={() => router.push('/(web)/register-tourist' as any)}>
            <Text style={[s.navBtnText, { color: '#FFFFFF' }]}>Get started</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero ── */}
      <ImageBackground source={HERO_BG} style={s.hero} resizeMode="cover">
        <View style={s.heroOverlay} />
        <View style={s.heroContent}>
          <Text style={s.heroEyebrow}>MATI CITY, DAVAO ORIENTAL  /  PHILIPPINES</Text>
          <Text style={s.heroTitle}>{'Discover More.\nTravel Smarter.\nSpend Better.'}</Text>
          <Text style={s.heroSub}>
            Explore destinations, estimate your travel expenses, discover local businesses, and plan your next adventure with KalawGuide.
          </Text>
          <View style={s.heroBtns}>
            <TouchableOpacity style={[s.heroBtnPrimary, { backgroundColor: colors.primary }]} onPress={() => router.push('/(web)/explore' as any)}>
              <Text style={s.heroBtnText}>Explore Destinations</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.heroBtnSecondary, { borderColor: 'rgba(255,255,255,0.6)' }]} onPress={() => router.push('/(web)/register-tourist' as any)}>
              <Text style={s.heroBtnText}>Plan Your Trip</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.heroCaption}>Go beyond the usual. Start somewhere local.</Text>
        </View>
      </ImageBackground>

      {/* ── Travel search ── */}
      <View style={[s.searchSection, { backgroundColor: colors.surface }]}>
        <View style={s.searchRow}>
          <TextInput
            style={[s.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Where would you like to go?"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => search.trim() && router.push({ pathname: '/(web)/explore' as any, params: { q: search.trim() } })}
          />
          <TouchableOpacity
            style={[s.searchBtn, { backgroundColor: colors.primary }]}
            onPress={() => search.trim() && router.push({ pathname: '/(web)/explore' as any, params: { q: search.trim() } })}
          >
            <Text style={s.searchBtnText}>Find my next escape</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Featured destinations ── */}
      <View style={[s.section, { backgroundColor: colors.background }]}>
        <Text style={[s.eyebrow, { color: colors.accent }]}>THE COAST IS CALLING</Text>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Find your kind of escape.</Text>
        <Text style={[s.sectionSub, { color: colors.muted }]}>A fresh perspective on Mati and Davao Oriental.</Text>
        <View style={s.destGrid}>
          {featuredDests.map((d, i) => (
            <TouchableOpacity
              key={d.id ? d.id : `placeholder-${i}`}
              style={[s.destCard, { backgroundColor: colors.surface }]}
              onPress={() => d.id ? router.push(`/(web)/destination/${d.id}` as any) : router.push('/(web)/explore' as any)}
              activeOpacity={0.85}
            >
              <View style={[s.destImg, { backgroundColor: colors.subtle }]}>
                <Text style={s.destImgIcon}>{DEST_ICONS[i % DEST_ICONS.length]}</Text>
              </View>
              <View style={s.destBody}>
                <Text style={[s.destName, { color: colors.text }]} numberOfLines={1}>{d.name}</Text>
                <Text style={[s.destLoc, { color: colors.muted }]}>📍 {d.location}</Text>
                <Text style={[s.destFee, { color: colors.muted }]}>
                  {d.estimated_fee != null ? (d.estimated_fee === 0 ? 'Free' : `₱${d.estimated_fee}`) : 'Free'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Explore by category ── */}
      <View style={[s.section, { backgroundColor: colors.background }]}>
        <Text style={[s.eyebrow, { color: colors.accent }]}>FOLLOW YOUR CURIOSITY</Text>
        <Text style={[s.sectionTitle, { color: colors.text }]}>A place for every kind of traveler.</Text>
        <View style={s.catGrid}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.catChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/(web)/explore' as any)}
            >
              <Text style={[s.catChipText, { color: colors.primary }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Budget planner promo ── */}
      <View style={[s.section, { backgroundColor: '#F2EBDC' }]}>
        <View style={s.budgetRow}>
          <View style={s.budgetLeft}>
            <Text style={[s.eyebrow, { color: colors.accent }]}>LESS GUESSWORK. MORE GOING.</Text>
            <Text style={[s.sectionTitle, { color: '#122F3C' }]}>Know Your Budget Before You Travel.</Text>
            <Text style={[s.sectionSub, { color: '#57717A' }]}>
              Build a realistic plan around your own estimates, then track what you actually spend.
            </Text>
            <TouchableOpacity style={[s.heroBtnPrimary, { backgroundColor: colors.primary, alignSelf: 'flex-start' }]} onPress={() => router.push('/(web)/sign-in' as any)}>
              <Text style={s.heroBtnText}>Plan Your Budget</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.budgetCard, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[s.budgetCardTitle, { color: '#122F3C' }]}>A weekend for two</Text>
            <Text style={{ color: '#57717A', fontSize: 12, marginBottom: 12 }}>Example only · 2 travelers · 3 days</Text>
            {[['Transportation', '₱2,000'], ['Accommodation', '₱4,000'], ['Food', '₱3,000'], ['Activities', '₱2,000'], ['Other expenses', '₱1,000']].map(([label, val]) => (
              <View key={label} style={s.budgetRow2}>
                <Text style={{ color: '#57717A', fontSize: 14 }}>{label}</Text>
                <Text style={{ color: '#57717A', fontSize: 14 }}>{val}</Text>
              </View>
            ))}
            <View style={[s.budgetDivider, { backgroundColor: '#DDE7E7' }]} />
            <View style={s.budgetRow2}>
              <Text style={{ color: '#122F3C', fontSize: 16, fontWeight: '700' }}>Estimated total</Text>
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>₱12,000</Text>
            </View>
            <Text style={{ color: '#57717A', fontSize: 12 }}>₱6,000 per person · Traveler-entered amounts</Text>
          </View>
        </View>
      </View>

      {/* ── Local businesses ── */}
      <View style={[s.section, { backgroundColor: colors.background }]}>
        <Text style={[s.eyebrow, { color: colors.accent }]}>SUPPORT LOCAL</Text>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Meet the people behind the places.</Text>
        <Text style={[s.sectionSub, { color: colors.muted }]}>Find a stay, a great meal, or help getting around.</Text>
        <View style={s.destGrid}>
          {BIZ_PLACEHOLDERS.map((b, i) => (
            <TouchableOpacity key={i} style={[s.destCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/(web)/businesses' as any)} activeOpacity={0.85}>
              <View style={[s.destImg, { backgroundColor: colors.subtle }]}>
                <Text style={s.destImgIcon}>{b.icon}</Text>
              </View>
              <View style={s.destBody}>
                <Text style={[s.destName, { color: colors.text }]}>{b.name}</Text>
                <Text style={[s.destLoc, { color: colors.muted }]}>{b.type}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── How it works ── */}
      <View style={[s.section, { backgroundColor: colors.background }]}>
        <Text style={[s.eyebrow, { color: colors.accent }]}>YOUR NEXT TRIP, SIMPLIFIED</Text>
        <Text style={[s.sectionTitle, { color: colors.text }]}>{'From "where?" to "we\'re here."'}</Text>
        <View style={s.stepsRow}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.stepCol}>
              <Text style={[s.stepNum, { color: colors.accent }]}>0{i + 1}</Text>
              <Text style={[s.stepTitle, { color: colors.text }]}>{step.title}</Text>
              <Text style={[s.stepDesc, { color: colors.muted }]}>{step.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Why KalawGuide ── */}
      <View style={[s.section, { backgroundColor: '#EDF3F2' }]}>
        <Text style={[s.eyebrow, { color: colors.accent }]}>BUILT AROUND YOUR JOURNEY</Text>
        <Text style={[s.sectionTitle, { color: '#122F3C' }]}>Everything you need. Nothing in the way.</Text>
        <Text style={[s.sectionSub, { color: '#57717A' }]}>Travel planning in one platform, made for a more considered adventure.</Text>
        <View style={s.benefitsGrid}>
          {BENEFITS.map(b => (
            <View key={b} style={s.benefitItem}>
              <Text style={[s.benefitText, { color: '#122F3C' }]}>✓  {b}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Text style={[s.footerLogo, { color: colors.primary }]}>≋  KalawGuide</Text>
        <Text style={[s.footerSub, { color: colors.muted }]}>Discover more of the Philippines, starting in Mati City.</Text>
        <View style={s.footerLinks}>
          {['About KalawGuide', 'Explore', 'Business Registration', 'Contact'].map(l => (
            <Text key={l} style={[s.footerLink, { color: colors.muted }]}>{l}</Text>
          ))}
        </View>
        <View style={s.footerLinks}>
          {['Privacy Policy', 'Terms and Conditions', 'Emergency Information'].map(l => (
            <Text key={l} style={[s.footerLink, { color: colors.muted }]}>{l}</Text>
          ))}
        </View>
        <Text style={[s.footerCopy, { color: colors.muted }]}>© KalawGuide · Concept design · Destination photography is illustrative.</Text>
      </View>
    </ScrollView>
  );
}

const PLACEHOLDER_DESTS = [
  { id: '', name: 'Dahican Beach', location: 'Mati City', estimated_fee: 0 },
  { id: '', name: 'Waniban Island', location: 'Mati City', estimated_fee: null },
  { id: '', name: 'Sleeping Dinosaur', location: 'Mati City', estimated_fee: null },
];
const DEST_ICONS = ['🏖', '🏝', '⛰', '💧', '🌿', '🏛'];
const CATEGORIES = ['Beaches', 'Mountains', 'Nature', 'Historical Places', 'Food and Restaurants', 'Adventure Activities'];
const BIZ_PLACEHOLDERS = [
  { name: 'Coastal Table', type: 'Restaurant · Demo listing', icon: '🍽' },
  { name: 'Palm House Stay', type: 'Accommodation · Demo listing', icon: '🏡' },
  { name: 'Coastline Tours', type: 'Tour operator · Demo listing', icon: '⛵' },
];
const STEPS = [
  { title: 'Discover your destination.', desc: 'Find places that fit your pace and interests.' },
  { title: 'Estimate your travel expenses.', desc: 'Make a plan using your own budget inputs.' },
  { title: 'Plan and enjoy your trip.', desc: 'Keep your itinerary and expenses together.' },
];
const BENEFITS = [
  'Travel planning in one platform',
  'Estimated and actual expense tracking',
  'Local business discovery',
  'Organized itineraries',
  'Useful travel information',
];

const s = StyleSheet.create({
  root: { flex: 1 },
  // Nav
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 72, paddingVertical: 20, borderBottomWidth: 1, gap: 24 },
  navLogo: { fontFamily: 'Inter_700Bold', fontSize: 24, fontWeight: '700', marginRight: 8, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' } as any,
  navLinks: { flex: 1, flexDirection: 'row', gap: 28 },
  navLink: { fontSize: 14, fontWeight: '400' },
  navRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  navBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  navBtnPrimary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  navBtnText: { fontSize: 14, fontWeight: '600' },
  // Hero
  hero: { width: '100%' as any, height: 650, justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6,28,38,0.43)' },
  heroContent: { paddingLeft: 72, paddingBottom: 78, gap: 22, maxWidth: 700 },
  heroEyebrow: { color: '#D4FAF0', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 64, fontWeight: '800', lineHeight: 72 },
  heroSub: { color: '#F0F7F7', fontSize: 18, lineHeight: 26 },
  heroBtns: { flexDirection: 'row', gap: 20 },
  heroBtnPrimary: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12 },
  heroBtnSecondary: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)' },
  heroBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  heroCaption: { color: '#FFFFFF', fontSize: 12 },
  // Search
  searchSection: { paddingHorizontal: 72, paddingVertical: 32 },
  searchRow: { flexDirection: 'row', gap: 16, maxWidth: 1296 },
  searchInput: { flex: 1, height: 52, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, fontSize: 14, fontWeight: '600' },
  searchBtn: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, justifyContent: 'center' },
  searchBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  // Sections
  section: { paddingHorizontal: 72, paddingVertical: 56, gap: 24 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sectionTitle: { fontSize: 36, fontWeight: '700', lineHeight: 52 },
  sectionSub: { fontSize: 16, lineHeight: 24 },
  // Destinations
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  destCard: { width: 418, borderRadius: 20, overflow: 'hidden' },
  destImg: { height: 238, alignItems: 'center', justifyContent: 'center' },
  destImgIcon: { fontSize: 56 },
  destBody: { padding: 20, gap: 6 },
  destName: { fontSize: 16, fontWeight: '700' },
  destLoc: { fontSize: 14 },
  destFee: { fontSize: 14 },
  // Categories
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catChip: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  catChipText: { fontSize: 14, fontWeight: '700' },
  // Budget
  budgetRow: { flexDirection: 'row', gap: 32, alignItems: 'flex-start', maxWidth: 1296 },
  budgetLeft: { flex: 1, gap: 20 },
  budgetCard: { width: 632, borderRadius: 20, padding: 24, gap: 8 },
  budgetCardTitle: { fontSize: 22, fontWeight: '700' },
  budgetRow2: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetDivider: { height: 1, marginVertical: 8 },
  // Steps
  stepsRow: { flexDirection: 'row', gap: 20 },
  stepCol: { flex: 1, gap: 20 },
  stepNum: { fontSize: 32, fontWeight: '700' },
  stepTitle: { fontSize: 20, fontWeight: '700' },
  stepDesc: { fontSize: 14, lineHeight: 20 },
  // Benefits
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  benefitItem: { width: '47%' as any },
  benefitText: { fontSize: 16, fontWeight: '700' },
  // Footer
  footer: { paddingHorizontal: 72, paddingVertical: 56, gap: 16, borderTopWidth: 1 },
  footerLogo: { fontSize: 28, fontWeight: '700', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' } as any,
  footerSub: { fontSize: 16 },
  footerLinks: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  footerLink: { fontSize: 14 },
  footerCopy: { fontSize: 12 },
});
