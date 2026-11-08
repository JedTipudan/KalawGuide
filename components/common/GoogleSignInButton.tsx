import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius, TouchTarget } from '../../constants/tokens';

interface Props {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function GoogleSignInButton({ onPress, loading = false, disabled = false }: Props) {
  const { colors, isDark } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderColor: colors.border,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {/* Official Google G icon using colored text segments */}
          <View style={styles.googleIcon}>
            <Text style={styles.googleG}>
              <Text style={{ color: '#4285F4' }}>G</Text>
            </Text>
          </View>
          <Text style={[styles.label, { color: colors.text }]}>
            Continue with Google
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    minHeight: TouchTarget.min,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  googleIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.bodyLg,
    fontWeight: Typography.weight.medium,
  },
});
