import React from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, StyleProp, TextStyle } from 'react-native';
import { Typography } from '../../constants/tokens';

/**
 * Kiko — KalawGuide's mascot (a Mati travel bird). One place for every mascot image so screens stay consistent.
 * Source art: team-provided PNGs, resized/compressed into assets/images/mascot/.
 */
export const KIKO = {
  avatar: require('../../assets/images/mascot/kiko-avatar.png'),
  map: require('../../assets/images/mascot/kiko-map.png'),            // thumbs up + Mati map
  presenting: require('../../assets/images/mascot/kiko-presenting.png'), // waving, presenting
  welcome: require('../../assets/images/mascot/kiko-welcome.png'),    // "Explore Mati!" sign
  lookout: require('../../assets/images/mascot/kiko-lookout.png'),    // binoculars
  relax: require('../../assets/images/mascot/kiko-relax.png'),        // beach chair
} as const;

export type KikoPose = Exclude<keyof typeof KIKO, 'avatar'>;

// Natural aspect ratios (width / height) of the processed art, so images never stretch.
const RATIO: Record<KikoPose, number> = {
  map: 526 / 640,
  presenting: 563 / 640,
  welcome: 408 / 576,
  lookout: 371 / 592,
  relax: 410 / 586,
};

export function Kiko({ pose, height, style }: { pose: KikoPose; height: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={KIKO[pose]}
      style={[{ height, width: Math.round(height * RATIO[pose]) }, style]}
      resizeMode="contain"
      accessibilityLabel="Kiko, the KalawGuide mascot"
    />
  );
}

export function KikoAvatar({ size = 32, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={KIKO.avatar}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      accessibilityIgnoresInvertColors
    />
  );
}

/** Kiko avatar + "KalawGuide" wordmark, used in app bars and the web nav. */
export function BrandLogo({ color, size = 22, textStyle }: { color: string; size?: number; textStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="KalawGuide">
      <KikoAvatar size={Math.round(size * 1.45)} />
      <Text style={[styles.word, { color, fontSize: size }, textStyle]}>KalawGuide</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: Typography.fontFamilyBody, fontWeight: Typography.weight.bold },
});
