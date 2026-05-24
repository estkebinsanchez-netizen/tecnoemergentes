/**
 * Sistema de diseño — minimalista, iOS-inspired.
 * Un solo acento, tipografía clara, mucho espacio en blanco.
 */

export const Colors = {
  // Acento único
  accent: '#007AFF',
  accentSoft: '#E8F1FF',

  // Fondos
  bgPrimary: { light: '#F2F2F7', dark: '#000000' },
  bgCard: { light: '#FFFFFF', dark: '#1C1C1E' },
  bgSecondary: { light: '#F2F2F7', dark: '#2C2C2E' },

  // Texto
  labelPrimary: { light: '#000000', dark: '#FFFFFF' },
  labelSecondary: { light: '#6C6C70', dark: '#AEAEB2' },
  labelTertiary: { light: '#AEAEB2', dark: '#636366' },

  // Separadores
  separator: { light: '#E5E5EA', dark: '#38383A' },

  // Semánticos
  positive: '#34C759',
  positiveLight: { light: '#F0FDF4', dark: '#0D2A17' },
  negative: '#FF3B30',
  negativeLight: { light: '#FFF5F5', dark: '#2A0D0D' },
  warning: '#FF9500',
  warningLight: { light: '#FFF8EE', dark: '#2A1E00' },

  // Turno
  nocturno: { light: '#EEF4FF', dark: '#0D1A33', text: '#1D4ED8' },
  diurno: { light: '#FFFBEB', dark: '#2A1F00', text: '#92400E' },
  descanso: { light: '#F0FDF4', dark: '#0D2A17', text: '#166534' },
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.4 },
  title1: { fontSize: 28, fontWeight: '700' as const },
  title2: { fontSize: 22, fontWeight: '600' as const },
  title3: { fontSize: 20, fontWeight: '600' as const },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 17, fontWeight: '400' as const },
  callout: { fontSize: 16, fontWeight: '400' as const },
  subhead: { fontSize: 15, fontWeight: '400' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  caption2: { fontSize: 11, fontWeight: '400' as const },
} as const;

export function useTheme(dark: boolean) {
  return {
    bg: dark ? Colors.bgPrimary.dark : Colors.bgPrimary.light,
    card: dark ? Colors.bgCard.dark : Colors.bgCard.light,
    secondary: dark ? Colors.bgSecondary.dark : Colors.bgSecondary.light,
    text: dark ? Colors.labelPrimary.dark : Colors.labelPrimary.light,
    textSecondary: dark ? Colors.labelSecondary.dark : Colors.labelSecondary.light,
    textTertiary: dark ? Colors.labelTertiary.dark : Colors.labelTertiary.light,
    separator: dark ? Colors.separator.dark : Colors.separator.light,
    positiveBg: dark ? Colors.positiveLight.dark : Colors.positiveLight.light,
    negativeBg: dark ? Colors.negativeLight.dark : Colors.negativeLight.light,
    warningBg: dark ? Colors.warningLight.dark : Colors.warningLight.light,
  };
}
