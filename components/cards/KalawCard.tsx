import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../../constants/tokens';

interface Props {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function KalawCard({
  title,
  subtitle,
  imageUrl,
  badge,
  badgeColor,
  onPress,
  style,
  children,
}: Props) {
  const { colors, isDark } = useTheme();
  const shadow = isDark ? Shadows.dark.sm : Shadows.light.sm;

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, ...shadow },
        style,
      ]}
    >
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <View style={styles.body}>
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {badge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: badgeColor ?? colors.subtle },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.text }]}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: colors.muted }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  body: {
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.semiBold,
    lineHeight: Typography.size.bodyLg * Typography.lineHeight,
  },
  subtitle: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    lineHeight: Typography.size.body * Typography.lineHeight,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.label,
    fontWeight: Typography.weight.medium,
  },
});
