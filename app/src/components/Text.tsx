import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { FluidPreset, useFluidTextStyle } from '../theme/fluidType';

export type TextVariant = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type TextWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const DEFAULT_FLUID_PRESET: Partial<Record<TextVariant, FluidPreset>> = {
  '4xl': 'display',
  '3xl': 'heading',
  '2xl': 'subheading'
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
  hero?: boolean;
  fixedWidth?: number;
  /** Fluid type preset; display variants default to one. Pass `false` to opt out. */
  fluid?: FluidPreset | false;
}

export function Text({
  variant = 'base',
  weight = 'regular',
  color,
  hero = false,
  fixedWidth,
  fluid,
  style,
  children,
  ...rest
}: TextProps): React.JSX.Element {
  const { colors } = useTheme();

  const textColor = color || colors['on-surface-color'];
  const fontSize = tokens.typography.size[variant];
  const fontWeight = tokens.typography.weight[weight];
  const fluidPreset = fluid === false ? undefined : fluid ?? DEFAULT_FLUID_PRESET[variant];
  const fluidStyle = useFluidTextStyle(fluidPreset);

  const heroStyle = (hero || fixedWidth) ? {
    maxWidth: fixedWidth || tokens.layout.heroMaxWidth,
    width: '100%' as const,
    flexWrap: 'wrap' as const
  } : undefined;

  return (
    <RNText
      style={[
        styles.base,
        {
          fontSize,
          fontWeight,
          color: textColor
        },
        fluidStyle,
        heroStyle,
        style
      ]}
      allowFontScaling
      maxFontSizeMultiplier={tokens.accessibility.maxFontSizeMultiplier}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: tokens.typography.fontFamily.sans
  }
});
