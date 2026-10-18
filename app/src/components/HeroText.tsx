import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Text, TextVariant, TextWeight } from './Text';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export interface HeroTextProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  titleVariant?: TextVariant;
  titleWeight?: TextWeight;
  titleColor?: string;
  subtitleColor?: string;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

/**
 * HeroText Component
 * Standardizes headline and subtitle rendering with fixed width wrapping
 * to prevent awkward line breaks or excessive stretching across responsive screens.
 */
export function HeroText({
  title,
  subtitle,
  align = 'left',
  titleVariant = '3xl',
  titleWeight = 'bold',
  titleColor,
  subtitleColor,
  maxWidth = tokens.layout.heroMaxWidth,
  style,
  titleStyle,
  subtitleStyle,
  children
}: HeroTextProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          maxWidth,
          alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
        },
        style
      ]}
    >
      <Text
        variant={titleVariant}
        weight={titleWeight}
        color={titleColor || colors['on-background-color']}
        style={[styles.title, { textAlign: align }, titleStyle]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          variant="base"
          color={subtitleColor || colors['on-surface-variant-color']}
          style={[styles.subtitle, { textAlign: align }, subtitleStyle]}
        >
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
    marginBottom: tokens.spacing[4]
  },
  title: {
    width: '100%',
    flexWrap: 'wrap'
  },
  subtitle: {
    width: '100%',
    flexWrap: 'wrap',
    marginTop: tokens.spacing[1.5],
    lineHeight: 22
  }
});
