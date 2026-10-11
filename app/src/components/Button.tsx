import React from 'react';
import { Pressable, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'link' | 'destructive';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  /** Overrides the spoken label when the visible title lacks context. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  icon,
  accessibilityLabel,
  accessibilityHint
}: ButtonProps): React.JSX.Element {
  const { colors } = useTheme();

  let backgroundColor = colors['primary-color'];
  let textColor = colors['on-primary-color'];
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    backgroundColor = colors['secondary-container-color'];
    textColor = colors['on-secondary-container-color'];
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    borderColor = colors['outline-color'];
    textColor = colors['primary-color'];
  } else if (variant === 'link') {
    backgroundColor = 'transparent';
    borderColor = 'transparent';
    textColor = colors['primary-color'];
  } else if (variant === 'destructive') {
    backgroundColor = colors['error-color'];
    textColor = colors['on-error-color'];
  }

  if (disabled) {
    if (variant === 'link') {
      backgroundColor = 'transparent';
      textColor = colors['outline-color'];
    } else {
      backgroundColor = colors['surface-variant-color'];
      textColor = colors['on-surface-variant-color'];
      borderColor = 'transparent';
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: pressed ? 0.85 : 1.0
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" accessibilityElementsHidden importantForAccessibility="no" />
      ) : (
        <>
          {icon}
          <Text
            weight="semibold"
            variant="base"
            style={[styles.text, { color: textColor }, icon ? styles.iconMargin : undefined]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: tokens.accessibility.minTouchTarget,
    minWidth: tokens.accessibility.minTouchTarget,
    paddingVertical: tokens.spacing[3],
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing[4]
  },
  text: {
    textAlign: 'center'
  },
  iconMargin: {
    marginLeft: tokens.spacing[2]
  }
});
