import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';

export type TextVariant = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type TextWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
}

export function Text({
  variant = 'base',
  weight = 'regular',
  color,
  style,
  children,
  ...rest
}: TextProps): React.JSX.Element {
  const { colors } = useTheme();

  const textColor = color || colors['on-surface-color'];
  const fontSize = tokens.typography.size[variant];
  const fontWeight = tokens.typography.weight[weight];

  return (
    <RNText
      style={[
        styles.base,
        {
          fontSize,
          fontWeight,
          color: textColor
        },
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
