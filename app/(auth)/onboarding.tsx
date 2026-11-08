import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, FlatList, ListRenderItemInfo, useWindowDimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius } from '../../constants/tokens';
import { storage } from '../../utils/storage';

interface Slide {
  key: string;
  image: any;
  label: string;
  heading: string;
  body: string;
  dots: string;
}

const SLIDES: Slide[] = [
  {
    key: '1',
    image: require('../../assets/images/onboarding-1.png'),
    label: 'DISCOVER YOUR KIND OF ESCAPE',
    heading: 'More places.\nMore possibilities.',
    body: 'Find coastal escapes, local food, and experiences around Mati City. Save the places that feel like you.',
    dots: '●  ○  ○',
  },
  {
    key: '2',
    image: require('../../assets/images/onboarding-2.png'),
    label: 'PLAN WITH A CLEARER BUDGET',
    heading: 'Less guesswork.\nMore going.',
    body: 'Estimate your whole trip, split the cost per person, and compare your plan with what you spend.',
    dots: '○  ●  ○',
  },
  {
    key: '3',
    image: require('../../assets/images/onboarding-3.png'),
    label: 'MAKE ROOM FOR THE JOURNEY',
    heading: 'Your trip.\nAll together.',
    body: 'Keep your itinerary, saved places, and travel plans in one organized travel space.',
    dots: '○  ○  ●',
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  async function goNext() {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      await storage.setItem('kalawguide_onboarded', '1');
      router.replace('/(auth)/welcome');
    }
  }

  async function skip() {
    await storage.setItem('kalawguide_onboarded', '1');
    router.replace('/(auth)/welcome');
  }

  const renderItem = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={[styles.slide, { width }]}>
      <Image source={item.image} style={[styles.image, { width: width - 40 }]} resizeMode="cover" />
      <Text style={[styles.label, { color: colors.accent }]}>{item.label}</Text>
      <Text style={[styles.heading, { color: colors.text }]}>{item.heading}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{item.body}</Text>
      <Text style={[styles.dots, { color: colors.primary }]}>{item.dots}</Text>
    </View>
  );

  const isLast = index === SLIDES.length - 1;
  const topPad = Platform.OS === 'web' ? 0 : insets.top;
  // Always add bottom inset + extra buffer so buttons never hide behind nav bar
  const bottomPad = Platform.OS === 'web' ? 24 : insets.bottom + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.appBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.appBarTitle, { color: colors.primary }]}>≋ KalawGuide</Text>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={{ flex: 1 }}
      />

      <View style={[styles.buttons, { paddingBottom: bottomPad }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: colors.onPrimary }]}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.subtle, borderColor: colors.border }]}
          onPress={skip}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: colors.text }]}>Skip · Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  appBarTitle: { fontFamily: Typography.fontFamilyBody, fontSize: 22, fontWeight: '600' },
  slide: { paddingHorizontal: 20, paddingTop: 20, gap: Spacing.base },
  image: { height: 240, borderRadius: 16 },
  label: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  heading: { fontFamily: Typography.fontFamilyBody, fontSize: 26, fontWeight: '700', lineHeight: 26 * 1.4 },
  body: { fontFamily: Typography.fontFamilyBody, fontSize: 14, lineHeight: 14 * 1.5 },
  dots: { fontFamily: Typography.fontFamilyBody, fontSize: 12, fontWeight: '600', letterSpacing: 4 },
  buttons: { paddingHorizontal: 20, paddingTop: 12, gap: Spacing.md },
  primaryBtn: {
    paddingVertical: 14, borderRadius: Radius.lg, alignItems: 'center',
  },
  secondaryBtn: {
    paddingVertical: 14, borderRadius: Radius.lg,
    borderWidth: 1.5, alignItems: 'center',
  },
  btnText: { fontFamily: Typography.fontFamilyBody, fontSize: 15, fontWeight: '600' },
});
