// KalawGuide Design Tokens
// Source of truth: Figma file "KalawGuide" (MZTmx7DKqJlhSyaObMO3Ht) → Design System › Semantic color palette
export const Colors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    subtle: '#E0F2FE',
    text: '#1F2937',
    muted: '#64748B',
    onNavigation: '#64748B',
    border: '#E2E8F0',
    primary: '#0E7490',
    onPrimary: '#FFFFFF',
    accent: '#22C55E',
    success: '#22C55E',
    warning: '#F97316',
    danger: '#F97316',
    sand: '#E0F2FE',
    fabLight: '#0E7490',
    fabDark: '#22B8C7',
    statusBarDark: '#123747',
  },
  dark: {
    background: '#071B26',
    surface: '#123747',
    elevated: '#194456',
    subtle: '#194456',
    text: '#F8FAFC',
    muted: '#CBD5E1',
    onNavigation: '#94A3B8',
    border: '#254656',
    primary: '#22B8C7',
    onPrimary: '#071B26',
    accent: '#22B8C7',
    success: '#4ADE80',
    warning: '#FB923C',
    danger: '#FB923C',
    sand: '#0B2635',
    fabLight: '#0E7490',
    fabDark: '#22B8C7',
    statusBarDark: '#123747',
  },
} as const;

// Figma "RequestStatus/*" badge fills (same in light and dark themes)
export const StatusColors = {
  pending: '#FFC83D',
  under_review: '#3772D4',
  approved: '#00B3C7',
  rejected: '#FF5700',
  cancelled: '#F3E9DF',
  completed: '#0755CC',
  suspended: '#A83200',
  not_submitted: '#E2E8F0',
} as const;

const DARK_LABEL_FILLS: string[] = [StatusColors.pending, StatusColors.cancelled, StatusColors.not_submitted];

/** Label color for text on a solid status fill (Figma RequestStatus/Label-Dark | Label-Light). */
export function statusLabel(fill: string): string {
  return DARK_LABEL_FILLS.includes(fill) ? '#171717' : '#FFFFFF';
}

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
      shadowColor: '#1F2937', // Figma "KalawGuide / Soft card"
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#1F2937',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#1F2937',
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
