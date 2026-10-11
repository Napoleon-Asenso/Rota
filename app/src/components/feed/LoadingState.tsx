import React from 'react';
import { View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { tokens } from '../../theme/tokens';
import { Text } from '../Text';

export interface LoadingStateProps {
  style?: ViewStyle;
}

/**
 * Screen 13 Component: LoadingState
 * Features:
 * - Centered animated spinner in primary-color
 * - Headline: "Loading activities..."
 * - Subtext: "Please wait a moment."
 */
export function LoadingState({ style }: LoadingStateProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading activities... Please wait a moment."
      accessibilityLiveRegion="polite"
    >
      <View style={styles.spinnerWrapper}>
        <ActivityIndicator
          size="large"
          color={colors['primary-color']}
          style={styles.spinner}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <Text
        weight="bold"
        variant="xl"
        color={colors['on-background-color']}
        style={styles.headline}
      >
        Loading activities...
      </Text>
      <Text
        variant="sm"
        color={colors['on-surface-variant-color']}
        style={styles.subtext}
      >
        Please wait a moment.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing[6],
    paddingVertical: tokens.spacing[10]
  },
  spinnerWrapper: {
    marginBottom: tokens.spacing[4],
    justifyContent: 'center',
    alignItems: 'center'
  },
  spinner: {
    transform: [{ scale: 1.25 }]
  },
  headline: {
    textAlign: 'center',
    marginBottom: tokens.spacing[1]
  },
  subtext: {
    textAlign: 'center'
  }
});

export default LoadingState;
