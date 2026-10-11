import React from 'react';
import { View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { tokens } from '../../theme/tokens';
import { Text } from '../Text';

export interface InfiniteScrollFooterProps {
  loading?: boolean;
  style?: ViewStyle;
}

/**
 * Screen 17 Component: InfiniteScrollFooter
 * Features:
 * - Footer loader with small spinner in primary-color
 * - Label: "Loading more..."
 * - Accessible progressbar status
 */
export function InfiniteScrollFooter({
  loading = true,
  style
}: InfiniteScrollFooterProps): React.JSX.Element | null {
  const { colors } = useTheme();

  if (!loading) return null;

  return (
    <View
      style={[styles.footer, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading more activities"
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator
        size="small"
        color={colors['primary-color']}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        weight="medium"
        variant="sm"
        color={colors['on-surface-variant-color']}
      >
        Loading more...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2.5],
    paddingVertical: tokens.spacing[5],
    minHeight: tokens.accessibility.minTouchTarget
  }
});

export default InfiniteScrollFooter;
