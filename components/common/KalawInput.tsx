import React, { useState, forwardRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, TextInputProps, ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing, Radius } from '../../constants/tokens';

type TextInputRef = React.ElementRef<typeof TextInput>;

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export const KalawInput = forwardRef<TextInputRef, Props>(function KalawInput({
  label,
  error,
  hint,
  containerStyle,
  secureTextEntry,
  ...inputProps
}: Props, ref) {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: error ? colors.danger : colors.border }]}>
        <TextInput
          ref={ref}
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.muted}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          returnKeyType={inputProps.returnKeyType ?? 'next'}
          blurOnSubmit={inputProps.blurOnSubmit ?? false}
          {...inputProps}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            style={styles.eyeButton}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Text style={[styles.eyeText, { color: colors.muted }]}>
              {showPassword ? '🙈' : '👁'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: {
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    minHeight: 48,
    paddingHorizontal: Spacing.base,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamilyBody,
    fontSize: Typography.size.bodyLg,
    paddingVertical: Spacing.md,
  },
  eyeButton: { padding: Spacing.sm },
  eyeText: { fontSize: 16 },
  error: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
  hint: { fontFamily: Typography.fontFamilyBody, fontSize: Typography.size.label },
});
