import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export type BadgeTone = 'emerald' | 'amber' | 'blue' | 'purple' | 'neutral';
export type SemanticStatus = 'Confirmed' | 'Pending' | 'Invited';

export interface BadgeProps {
  label?: string;
  status?: SemanticStatus | string;
  tone?: BadgeTone;
  style?: ViewStyle;
}

export function Badge({ label, status, tone, style }: BadgeProps): React.JSX.Element {
  const { colors } = useTheme();

  const displayLabel = label || status || '';

  // Determine tone from semantic status if not explicitly given
  let resolvedTone: BadgeTone = tone || 'neutral';
  if (!tone && status) {
    const s = status.toLowerCase();
    if (s === 'confirmed') resolvedTone = 'emerald';
    else if (s === 'pending') resolvedTone = 'amber';
    else if (s === 'invited') resolvedTone = 'blue';
  } else if (!tone && label) {
    const l = label.toLowerCase();
    if (l === 'confirmed') resolvedTone = 'emerald';
    else if (l === 'pending') resolvedTone = 'amber';
    else if (l === 'invited') resolvedTone = 'blue';
  }

  let bg = colors['surface-variant-color'];
  let text = colors['on-surface-variant-color'];

  if (resolvedTone === 'emerald') {
    bg = '#E8F5E9';
    text = '#1B5E20'; // ~7:1 on bg (WCAG AAA)
  } else if (resolvedTone === 'amber') {
    bg = '#FFF8E1';
    text = '#7A4A00'; // ~7:1 on bg (WCAG AAA)
  } else if (resolvedTone === 'blue') {
    bg = colors['secondary-container-color'];
    text = colors['on-secondary-container-color'];
  } else if (resolvedTone === 'purple') {
    bg = colors['primary-container-color'];
    text = colors['on-primary-container-color'];
  }

  return (
    <View
      style={[styles.badge, { backgroundColor: bg }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Status: ${displayLabel}`}
    >
      <Text style={[styles.text, { color: text }]} weight="semibold" variant="xs">
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: tokens.spacing[2.5],
    paddingVertical: tokens.spacing[1],
    borderRadius: tokens.radius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    letterSpacing: 0.2
  }
});
