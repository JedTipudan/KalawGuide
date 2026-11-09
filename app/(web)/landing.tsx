import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { getDatabase } from '../../database/migrations/init';

const HERO_SLIDES = [
  require('../../assets/images/hero-bg.png'),
  require('../../assets/images/hero-coast.png'),
  require('../../assets/images/dest-waniban.png'),
  require('../../assets/images/dest-sleeping-dinosaur.png'),
];

export default function WebLandingScreen() {
  const { colors, mode, setMode, isDark } = useTheme();
  const router = useRouter();
  const [destinations, setDestinations] = useState<{ id: string; name: string; location: string; estimated_fee: number | null }[]>([]);
  const [search, setSearch] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    getDatabase().then(db =>
      db.getAllAsync<{ id: string; name: string; location: string; estimated_fee: number | null }>(
        'SELECT id, name, location, estimated_fee FROM destinations WHERE is_featured = 1 AND is_active = 1 LIMIT 3'
      )
    ).then(setDestinations).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlideIndex(i => (i + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const themeLabel = mode === 'light' ? '☀ Light' : mode === 'dark' ? '☾ Dark' : '◐ System';
  function cycleTheme() {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  }

  const featuredDests = destinations.length > 0 ? destinations : PLACEHOLDER_DESTS;

  const budgetBg      = isDark ? colors.surface : '#F2EBDC';
  const budgetCardBg  = isDark ? colors.subtle  : '#FFFFFF';
  const budgetTitle   = isDark ? colors.text    : '#122F3C';
  const budgetMuted   = isDark ? colors.muted   : '#57717A';
  const budgetDivider = isDark ? colors.border  : '#DDE7E7';
  const whyBg         = isDark ? colors.subtle  : '#EDF3F2';
  const whyTitle      = isDark ? colors.text    : '#122F3C';
  const whyMuted      = isDark ? colors.muted   : '#57717A';

  return (
    <ScrollView style={[s.root, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>

      {/* ── Navigation ── */}
      <View style={[s.nav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.navLogo, { color: colors.primary }]}>≋  KalawGuide</Text>
        <View style={s.navLinks}>
          {['Home', 'Explore Destinations', 'Local Businesses', 'About'].map(l => (
            <TouchableOpacity key={l} onPress={() => l === 'Explore Destinations' ? router.push('/(web)/explore' as any) : undefined}>
              <div className="nav-link">
                <Text style={[s.navLink, { color: colors.muted }]}>{l}</Text>
              </div>
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
            <Text style={[s.navBtnText, { color: colors.onPrimary }]}>Get started</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero carousel — all slides stacked, CSS opacity transition ── */}
      <View style={s.hero}>
        {/* All slides rendered; only active one is visible via CSS */}
        {HERO_SLIDES.map((src, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: i === slideIndex ? 1 : 0,
              transition: 'opacity 1s cubic-bezier(0.4,0,0.2,1)',
            } as any}
          >
            <Image source={src} style={s.heroSlideImg} resizeMode="cover" />
          </div>
        ))}
        <View style={s.heroOverlay} />
        {/* dots */}
        <View style={s.heroDots}>
          {HERO_SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setSlideIndex(i)}>
              <View style={[s.heroDot, i === slideIndex && s.heroDotActive]} />
            </TouchableOpacity>
          ))}
        </View>
        {/* text */}
        <div className="reveal-left" style={{ zIndex: 2, position: 'relative' } as any}>
          <View style={s.heroContent}>
            <Text style={s.heroEyebrow}>MATI CITY, DAVAO ORIENTAL  /  PHILIPPINES</Text>
            <Text style={s.heroTitle}>{'Discover More.\nTravel Smarter.\nSpend Better.'}</Text>
            <Text style={s.heroSub}>
              Explore destinations, estimate your travel expenses, discover local businesses, and plan your next adventure with KalawGuide.
            </Text>
            <View style={s.heroBtns}>
              <div className="hover-glow">
                <TouchableOpacity style={[s.heroBtnPrimary, { backgroundColor: colors.primary }]} onPress={() => router.push('/(web)/explore' as any)}>
                  <Text style={[s.heroBtnText, { color: colors.onPrimary }]}>Explore Destinations</Text>
                </TouchableOpacity>
              </div>
              <div className="hover-glow">
                <TouchableOpacity style={s.heroBtnSecondary} onPress={() => router.push('/(web)/register-tourist' as any)}>
                  <Text style={s.heroBtnText}>Plan Your Trip</Text>
                </TouchableOpacity>
              </div>
            </View>
            <Text style={s.heroCaption}>Go beyond the usual. Start somewhere local.</Text>
          </View>
        </div>
      </View>

      {/* ── Travel search ── */}
      <div className="reveal">
        <View style={[s.searchSection, { backgroundColor: colors.surface }]}>
          <View style={s.searchRow}>
            <TextInput
              style={[s.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
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
              <Text style={[s.searchBtnText, { color: colors.onPrimary }]}>Find my next escape</Text>
            </TouchableOpacity>
          </View>
        </View>
      </div>

      {/* ── Featured destinations ── */}
      <View style={[s.section, { backgroundColor: colors.background }]}>
        <div className="reveal-left"><Text style={[s.eyebrow, { color: colors.accent }]}>THE COAST IS CALLING</Text></div>
        <div className="reveal"><Text style={[s.sectionTitle, { color: colors.text }]}>Find your kind of escape.</Text></div>
        <div className="reveal"><Text style={[s.sectionSub, { color: colors.muted }]}>A fresh perspective on Mati and Davao Oriental.</Text></div>
        <div className="dest-grid reveal-group">
          {featuredDests.map((d, i) => (
            <div key={d.id || i} className="reveal hover-lift">
              <TouchableOpacity
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
            </div>
          ))}
        </div>
      </View>

      {/* ── Explore by category ── */}
      <View style={[s.section, { backgroundColor: colors.background }]}>
        <div className="reveal-left"><Text style={[s.eyebrow, { color: colors.accent }]}>FOLLOW YOUR CURIOSITY</Text></div>
        <div className="reveal"><Text style={[s.sectionTitle, { color: colors.text }]}>A place for every kind of traveler.</Text></div>
        <div className="reveal reveal-group" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12 } as any}>
          {CATEGORIES.map(c => (
            <div key={c} className="reveal hover-chip">
              <TouchableOpacity style={[s.catChip, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/(web)/explore' as any)}>
                <Text style={[s.catChipText, { color: colors.primary }]}>{c}</Text>
              </TouchableOpacity>
            </div>
          ))}
        </div>
      </View>

      {/* ── Budget planner promo ── */}
      <View style={[s.section, { backgroundColor: budgetBg }]}>
        <div className="reveal" style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'flex-start' } as any}>
          <View style={s.budgetLeft}>
            <Text style={[s.eyebrow, { color: colors.accent }]}>LESS GUESSWORK. MORE GOING.</Text>
            <Text style={[s.sectionTitle, { color: budgetTitle }]}>Know Your Budget Before You Travel.</Text>
            <Text style={[s.sectionSub, { color: budgetMuted }]}>
              Build a realistic plan around your own estimates, then track what you actually spend.
            </Text>
            <div className="hover-glow" style={{ alignSelf: 'flex-start' } as any}>
              <TouchableOpacity style={[s.heroBtnPrimary, { backgroundColor: colors.primary }]} onPress={() => router.push('/(web)/sign-in' as any)}>
                <Text style={[s.heroBtnText, { color: colors.onPrimary }]}>Plan Your Budget</Text>
              </TouchableOpacity>
            </div>
          </View>
          <div className="reveal-scale hover-lift" style={{ flex: 1 } as any}>
            <View style={[s.budgetCard, { backgroundColor: budgetCardBg, borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={[s.budgetCardTitle, { color: budgetTitle }]}>A weekend for two</Text>
              <Text style={[s.budgetMeta, { color: budgetMuted }]}>Example only · 2 travelers · 3 days</Text>
              {[['Transportation', '₱2,000'], ['Accommodation', '₱4,000'], ['Food', '₱3,000'], ['Activities', '₱2,000'], ['Other expenses', '₱1,000']].map(([label, val]) => (
                <View key={label} style={s.budgetRow2}>
                  <Text style={[s.budgetRowText, { color: budgetMuted }]}>{label}</Text>
                  <Text style={[s.budgetRowText, { color: budgetMuted }]}>{val}</Text>
                </View>
              ))}
              <View style={[s.budgetDivider, { backgroundColor: budgetDivider }]} />
              <View style={s.budgetRow2}>
                <Text style={[s.budgetTotal, { color: budgetTitle }]}>Estimated total</Text>
                <Text style={[s.budgetTotal, { color: colors.primary }]}>₱12,000</Text>
              </View>
              <Text style={[s.budgetPerPerson, { color: budgetMuted }]}>₱6,000 per person · Traveler-entered amounts</Text>
            </View>
          </div>
        </div>
      </View>

      {/* ── Local businesses ── */}
      <View style={[s.section, { backgroundColor: colors.background }]}>
        <div className="reveal-left"><Text style={[s.eyebrow, { color: colors.accent }]}>SUPPORT LOCAL</Text></div>
        <div className="reveal"><Text style={[s.sectionTitle, { color: colors.text }]}>Meet the people behind the places.</Text></div>
        <div className="reveal"><Text style={[s.sectionSub, { color: colors.muted }]}>Find a stay, a great meal, or help getting around.</Text></div>
        <div className="dest-grid reveal-group">
          {BIZ_PLACEHOLDERS.map((b, i) => (
            <div key={i} className="reveal hover-lift">
              <TouchableOpacity style={[s.destCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/(web)/businesses' as any)} activeOpacity={0.85}>
                <View style={[s.destImg, { backgroundColor: colors.subtle }]}>
                  <Text style={s.destImgIcon}>{b.icon}</Text>
                </View>
                <View style={s.destBody}>
                  <Text style={[s.destName, { color: colors.text }]}>{b.name}</Text>
                  <Text style={[s.destLoc, { color: colors.muted }]}>{b.type}</Text>
                </View>
              </TouchableOpacity>
            </div>
          ))}
        </div>
      </View>

      {/* ── How it works ── */}
      <View style={[s.section, { backgroundColor: colors.background }]}>
        <div className="reveal-left"><Text style={[s.eyebrow, { color: colors.accent }]}>YOUR NEXT TRIP, SIMPLIFIED</Text></div>
        <div className="reveal"><Text style={[s.sectionTitle, { color: colors.text }]}>{'From "where?" to "we\'re here."'}</Text></div>
        <div className="reveal reveal-group" style={{ display: 'flex', flexDirection: 'row', gap: 20 } as any}>
          {STEPS.map((step, i) => (
            <div key={i} className="reveal" style={{ flex: 1 } as any}>
              <View style={s.stepCol}>
                <Text style={[s.stepNum, { color: colors.accent }]}>0{i + 1}</Text>
                <Text style={[s.stepTitle, { color: colors.text }]}>{step.title}</Text>
                <Text style={[s.stepDesc, { color: colors.muted }]}>{step.desc}</Text>
              </View>
            </div>
          ))}
        </div>
      </View>

      {/* ── Why KalawGuide ── */}
      <View style={[s.section, { backgroundColor: whyBg }]}>
        <div className="reveal-left"><Text style={[s.eyebrow, { color: colors.accent }]}>BUILT AROUND YOUR JOURNEY</Text></div>
        <div className="reveal"><Text style={[s.sectionTitle, { color: whyTitle }]}>Everything you need. Nothing in the way.</Text></div>
        <div className="reveal"><Text style={[s.sectionSub, { color: whyMuted }]}>Travel planning in one platform, made for a more considered adventure.</Text></div>
        <div className="reveal reveal-group" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 16 } as any}>
          {BENEFITS.map(b => (
            <div key={b} className="reveal" style={{ width: '47%' } as any}>
              <Text style={[s.benefitText, { color: whyTitle }]}>✓  {b}</Text>
            </div>
          ))}
        </div>
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
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 72, paddingVertical: 20, borderBottomWidth: 1, gap: 24 },
  navLogo: { fontSize: 24, fontWeight: '700', marginRight: 8 },
  navLinks: { flex: 1, flexDirection: 'row', gap: 28 },
  navLink: { fontSize: 14, fontWeight: '400' },
  navRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  navBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  navBtnPrimary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  navBtnText: { fontSize: 14, fontWeight: '600' },
  // Hero — reduced to 500px, all slides stacked absolutely
  hero: { width: '100%' as any, height: 500, justifyContent: 'flex-end', overflow: 'hidden' },
  heroSlideImg: { position: 'absolute', top: 0, left: 0, width: '100%' as any, height: '100%' as any },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6,28,38,0.50)', zIndex: 1 },
  heroDots: { position: 'absolute', bottom: 24, right: 72, flexDirection: 'row', gap: 8, zIndex: 3 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  heroDotActive: { backgroundColor: '#FFFFFF', width: 22, borderRadius: 4 },
  heroContent: { paddingLeft: 72, paddingBottom: 60, gap: 18, maxWidth: 680 },
  heroEyebrow: { color: '#D4FAF0', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 52, fontWeight: '800', lineHeight: 62 },
  heroSub: { color: '#F0F7F7', fontSize: 17, lineHeight: 26 },
  heroBtns: { flexDirection: 'row', gap: 16 },
  heroBtnPrimary: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12 },
  heroBtnSecondary: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)' },
  heroBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  heroCaption: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  // Search
  searchSection: { paddingHorizontal: 72, paddingVertical: 32 },
  searchRow: { flexDirection: 'row', gap: 16 },
  searchInput: { flex: 1, height: 52, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, fontSize: 14, fontWeight: '600' },
  searchBtn: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, justifyContent: 'center' },
  searchBtnText: { fontSize: 14, fontWeight: '600' },
  // Sections
  section: { paddingHorizontal: 72, paddingVertical: 56, gap: 24 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sectionTitle: { fontSize: 36, fontWeight: '700', lineHeight: 52 },
  sectionSub: { fontSize: 16, lineHeight: 26 },
  // Destination cards
  destImg: { height: 200, alignItems: 'center', justifyContent: 'center' },
  destImgIcon: { fontSize: 56 },
  destCard: { borderRadius: 20, overflow: 'hidden' },
  destBody: { padding: 20, gap: 6 },
  destName: { fontSize: 16, fontWeight: '700' },
  destLoc: { fontSize: 14 },
  destFee: { fontSize: 14 },
  // Categories
  catChip: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  catChipText: { fontSize: 14, fontWeight: '700' },
  // Budget
  budgetLeft: { flex: 1, gap: 20 },
  budgetCard: { borderRadius: 20, padding: 28, gap: 10 },
  budgetCardTitle: { fontSize: 22, fontWeight: '700' },
  budgetMeta: { fontSize: 12, marginBottom: 4 },
  budgetRow2: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetRowText: { fontSize: 14 },
  budgetDivider: { height: 1, marginVertical: 8 },
  budgetTotal: { fontSize: 16, fontWeight: '700' },
  budgetPerPerson: { fontSize: 12 },
  // Steps
  stepCol: { gap: 12 },
  stepNum: { fontSize: 32, fontWeight: '700' },
  stepTitle: { fontSize: 20, fontWeight: '700' },
  stepDesc: { fontSize: 14, lineHeight: 22 },
  // Benefits
  benefitText: { fontSize: 16, fontWeight: '700' },
  // Footer
  footer: { paddingHorizontal: 72, paddingVertical: 56, gap: 16, borderTopWidth: 1 },
  footerLogo: { fontSize: 28, fontWeight: '700' },
  footerSub: { fontSize: 16 },
  footerLinks: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  footerLink: { fontSize: 14 },
  footerCopy: { fontSize: 12 },
});
