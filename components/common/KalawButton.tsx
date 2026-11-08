import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius, TouchTarget } from '../../constants/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function KalawButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: Props) {
  const { colors } = useTheme();

  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    ...styles.base,
    ...sizeStyles[size],
    ...(fullWidth && { width: '100%' }),
    ...variantContainerStyle(variant, colors, isDisabled),
    ...(style as ViewStyle),
  };

  const labelStyle: TextStyle = {
    ...styles.label,
    ...sizeLabelStyles[size],
    ...variantLabelStyle(variant, colors, isDisabled),
    ...(textStyle as TextStyle),
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.onPrimary : colors.primary}
        />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function variantContainerStyle(
  variant: Variant,
  colors: ReturnType<typeof useTheme>['colors'],
  disabled: boolean
): ViewStyle {
  const opacity = disabled ? 0.5 : 1;
  switch (variant) {
    case 'primary':
      return { backgroundColor: colors.primary, opacity };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
        opacity,
      };
    case 'ghost':
      return { backgroundColor: 'transparent', opacity };
    case 'danger':
      return { backgroundColor: colors.danger, opacity };
  }
}

function variantLabelStyle(
  variant: Variant,
  colors: ReturnType<typeof useTheme>['colors'],
  _disabled: boolean
): TextStyle {
  switch (variant) {
    case 'primary':
      return { color: colors.onPrimary };
    case 'secondary':
      return { color: colors.primary };
    case 'ghost':
      return { color: colors.primary };
    case 'danger':
      return { color: '#FFFFFF' };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    minHeight: TouchTarget.min,
  },
  label: {
    fontFamily: Typography.fontFamilyBody,
    fontWeight: Typography.weight.semiBold,
    textAlign: 'center',
  },
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 36 },
  md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base },
};

const sizeLabelStyles: Record<Size, TextStyle> = {
  sm: { fontSize: Typography.size.label },
  md: { fontSize: Typography.size.bodyLg },
  lg: { fontSize: Typography.size.bodyLg },
};
