import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';

type CardAccessibilityProps = Pick<
  ViewProps,
  'accessible' | 'accessibilityLabel' | 'accessibilityRole' | 'accessibilityHint'
>;

export interface CardProps extends CardAccessibilityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({ children, style, variant = 'elevated', ...a11yProps }: CardProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View
      {...a11yProps}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-container-lowest-color'],
          borderColor: variant === 'outlined' ? colors['outline-variant-color'] : 'transparent',
          borderWidth: variant === 'outlined' ? 1 : 0
        },
        variant === 'elevated' ? tokens.elevation[1] : undefined,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[3]
  }
});
