import rawTokens from './matisse-tokens-all.json';

export type RawTokens = typeof rawTokens;

/**
 * Utility to convert CSS rem string (e.g. "0.875rem") or px string (e.g. "16px") into React Native points.
 */
export function remToPx(remStr: string | number): number {
  if (typeof remStr === 'number') return remStr;
  if (!remStr || remStr === '0') return 0;
  if (remStr.endsWith('rem')) {
    return parseFloat(remStr) * 16;
  }
  if (remStr.endsWith('px')) {
    return parseFloat(remStr);
  }
  const val = parseFloat(remStr);
  return isNaN(val) ? 0 : val;
}

// Light mode default palette & status badge colors
export const colors = {
  ...rawTokens.color.light,
  status: {
    confirmed: {
      bg: '#E8F5E9',
      text: '#1B5E20'
    },
    pending: {
      bg: '#FFF8E1',
      text: '#7A4A00'
    },
    invited: {
      bg: rawTokens.color.light['secondary-container-color'],
      text: rawTokens.color.light['on-secondary-container-color']
    }
  }
} as const;

// Typography helpers & line heights
export const typography = {
  'font-family-sans': rawTokens.typography['font-family-sans'],
  'font-family-display': rawTokens.typography['font-family-display'],
  'font-family-mono': rawTokens.typography['font-family-mono'],
  fontFamily: {
    sans: rawTokens.typography['font-family-sans'],
    display: rawTokens.typography['font-family-display'],
    mono: rawTokens.typography['font-family-mono']
  },
  size: {
    xs: remToPx(rawTokens.typography['font-size-xs']),     // 12
    sm: remToPx(rawTokens.typography['font-size-sm']),     // 14
    base: remToPx(rawTokens.typography['font-size-base']), // 16
    lg: remToPx(rawTokens.typography['font-size-lg']),     // 18
    xl: remToPx(rawTokens.typography['font-size-xl']),     // 20
    '2xl': remToPx(rawTokens.typography['font-size-2xl']), // 24
    '3xl': remToPx(rawTokens.typography['font-size-3xl']), // 30
    '4xl': remToPx(rawTokens.typography['font-size-4xl']), // 36
    // Token string key aliases
    'font-size-xs': remToPx(rawTokens.typography['font-size-xs']),
    'font-size-sm': remToPx(rawTokens.typography['font-size-sm']),
    'font-size-base': remToPx(rawTokens.typography['font-size-base']),
    'font-size-lg': remToPx(rawTokens.typography['font-size-lg']),
    'font-size-xl': remToPx(rawTokens.typography['font-size-xl']),
    'font-size-2xl': remToPx(rawTokens.typography['font-size-2xl']),
    'font-size-3xl': remToPx(rawTokens.typography['font-size-3xl'])
  },
  lineHeight: {
    none: rawTokens.typography['line-height-none'],
    tight: rawTokens.typography['line-height-tight'],
    snug: rawTokens.typography['line-height-snug'],
    normal: rawTokens.typography['line-height-normal'],
    relaxed: rawTokens.typography['line-height-relaxed'],
    loose: rawTokens.typography['line-height-loose']
  },
  weight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const
  }
} as const;

// Spacing scale (supporting both spacing-1..spacing-8 and 1..32)
export const spacing = {
  0: 0,
  0.5: remToPx(rawTokens.spacing['spacing-0.5']), // 2
  1: remToPx(rawTokens.spacing['spacing-1']),     // 4
  1.5: remToPx(rawTokens.spacing['spacing-1.5']), // 6
  2: remToPx(rawTokens.spacing['spacing-2']),     // 8
  2.5: remToPx(rawTokens.spacing['spacing-2.5']), // 10
  3: remToPx(rawTokens.spacing['spacing-3']),     // 12
  3.5: remToPx(rawTokens.spacing['spacing-3.5']), // 14
  4: remToPx(rawTokens.spacing['spacing-4']),     // 16
  5: remToPx(rawTokens.spacing['spacing-5']),     // 20
  6: remToPx(rawTokens.spacing['spacing-6']),     // 24
  7: remToPx(rawTokens.spacing['spacing-7']),     // 28
  8: remToPx(rawTokens.spacing['spacing-8']),     // 32
  9: remToPx(rawTokens.spacing['spacing-9']),     // 36
  10: remToPx(rawTokens.spacing['spacing-10']),   // 40
  11: remToPx(rawTokens.spacing['spacing-11']),   // 44
  12: remToPx(rawTokens.spacing['spacing-12']),   // 48
  14: remToPx(rawTokens.spacing['spacing-14']),   // 56
  16: remToPx(rawTokens.spacing['spacing-16']),   // 64
  20: remToPx(rawTokens.spacing['spacing-20']),   // 80
  24: remToPx(rawTokens.spacing['spacing-24']),   // 96
  28: remToPx(rawTokens.spacing['spacing-28']),   // 112
  32: remToPx(rawTokens.spacing['spacing-32']),   // 128
  // Token key aliases
  'spacing-1': remToPx(rawTokens.spacing['spacing-1']),
  'spacing-2': remToPx(rawTokens.spacing['spacing-2']),
  'spacing-3': remToPx(rawTokens.spacing['spacing-3']),
  'spacing-4': remToPx(rawTokens.spacing['spacing-4']),
  'spacing-5': remToPx(rawTokens.spacing['spacing-5']),
  'spacing-6': remToPx(rawTokens.spacing['spacing-6']),
  'spacing-7': remToPx(rawTokens.spacing['spacing-7']),
  'spacing-8': remToPx(rawTokens.spacing['spacing-8'])
} as const;

// Border radius scale
export const borderRadius = {
  none: 0,
  xs: remToPx(rawTokens.borderRadius['radius-xs']), // 2
  sm: remToPx(rawTokens.borderRadius['radius-sm']), // 4
  md: remToPx(rawTokens.borderRadius['radius-md']), // 8
  lg: remToPx(rawTokens.borderRadius['radius-lg']), // 12
  xl: remToPx(rawTokens.borderRadius['radius-xl']), // 16
  '2xl': remToPx(rawTokens.borderRadius['radius-2xl']), // 24
  '3xl': remToPx(rawTokens.borderRadius['radius-3xl']), // 32
  full: 9999,
  // Token key aliases
  'radius-sm': remToPx(rawTokens.borderRadius['radius-sm']),
  'radius-md': remToPx(rawTokens.borderRadius['radius-md']),
  'radius-lg': remToPx(rawTokens.borderRadius['radius-lg']),
  'radius-full': 9999
} as const;

// Minimum touch target (44x44pt WCAG / iOS standard, 48dp Android)
export const touchTarget = {
  min: 44,
  width: 44,
  height: 44
} as const;

// Layout constraints (including fixed width hero text wrapping)
export const layout = {
  heroMaxWidth: 320,
  heroTextMaxWidth: 340,
  contentMaxWidth: 440
} as const;

// Typed, resolved numeric tokens for React Native StyleSheet consumption
export const tokens = {
  raw: rawTokens,
  color: rawTokens.color,
  colors,
  typography,
  spacing,
  radius: borderRadius,
  borderRadius,
  touchTarget,
  layout,
  elevation: {
    0: { elevation: 0, shadowOpacity: 0 },
    1: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
    2: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4 },
    3: { elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 6 },
    4: { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 10 },
    5: { elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 16 }
  },
  accessibility: {
    // 44pt minimum touch target per WCAG standard
    minTouchTarget: 44,
    // Spacing between adjacent targets
    touchTargetGap: 8,
    // Caps OS font scaling on dense UI so layouts stay usable at 200% text size
    maxFontSizeMultiplier: 2
  }
} as const;

export type ThemeColors = typeof rawTokens.color.light;
export type ColorScheme = 'light' | 'dark';

export function getThemeColors(mode: ColorScheme = 'light'): ThemeColors {
  return rawTokens.color[mode] as ThemeColors;
}

/**
 * Helper hook to access resolved design tokens
 */
export function useThemeTokens(): typeof tokens {
  return tokens;
}

// Named uppercase constants for convenience
export const COLORS = colors;
export const TYPOGRAPHY = typography;
export const SPACING = spacing;
export const BORDER_RADIUS = borderRadius;
export const TOUCH_TARGET = touchTarget;

