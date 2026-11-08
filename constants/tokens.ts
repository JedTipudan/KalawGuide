// KalawGuide Design Tokens
export const Colors = {
  light: {
    background: '#E8EFEE',
    surface: '#FFFFFF',
    subtle: '#D4E2E0',
    text: '#0D2530',
    muted: '#3D5A65',
    border: '#B0C8C8',
    primary: '#075C73',
    onPrimary: '#FFFFFF',
    accent: '#087F75',
    success: '#197151',
    warning: '#956112',
    danger: '#AC3545',
    sand: '#EDE6D6',
    fabLight: '#075C73',
    fabDark: '#6ED8DF',
    statusBarDark: '#122530',
  },
  dark: {
    background: '#0B1720',
    surface: '#122530',
    subtle: '#1A3040',
    text: '#E8F0F3',
    muted: '#ACC1C8',
    border: '#2A4050',
    primary: '#6ED8DF',
    onPrimary: '#0B1720',
    accent: '#4ECDC4',
    success: '#4CAF82',
    warning: '#F0A830',
    danger: '#E05A6A',
    sand: '#2A2218',
    fabLight: '#075C73',
    fabDark: '#6ED8DF',
    statusBarDark: '#122530',
  },
} as const;

export const Typography = {
  fontFamilyHeading: 'Manrope',
  fontFamilyBody: 'Inter',
  size: {
    h1: 48,
    h2: 36,
    h3: 28,
    h4: 22,
    h5: 18,
    h6: 16,
    bodyLg: 16,
    body: 14,
    labelLg: 13,
    label: 12,
    caption: 11,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: 1.45,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export const TouchTarget = {
  min: 44,
  fab: 56,
} as const;

export const Shadows = {
  light: {
    sm: {
      shadowColor: '#0D2530',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#0D2530',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0D2530',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  dark: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
  },
} as const;
