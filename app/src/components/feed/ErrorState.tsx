import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { tokens } from '../../theme/tokens';
import { Text } from '../Text';
import { Button } from '../Button';

export interface ErrorStateProps {
  onRetry?: () => void;
  style?: ViewStyle;
}

/**
 * Screen 16 Component: ErrorState
 * Features:
 * - Red/amber alert triangle icon in subtle error container
 * - Heading: "Something went wrong"
 * - Description: "We couldn't load your activities. Check your connection and try again."
 * - Action button: "Retry"
 */
export function ErrorState({ onRetry, style }: ErrorStateProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      {/* Alert Triangle Container */}
      <View
        style={[
          styles.alertCircle,
          { backgroundColor: colors['error-container-color'] }
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          weight="bold"
          variant="3xl"
          color={colors['on-error-container-color']}
          importantForAccessibility="no"
        >
          ⚠️
        </Text>
      </View>

      <Text
        weight="bold"
        variant="2xl"
        color={colors['on-background-color']}
        style={styles.heading}
        accessibilityRole="header"
      >
        Something went wrong
      </Text>

      <Text
        variant="base"
        color={colors['on-surface-variant-color']}
        style={styles.description}
      >
        We couldn't load your activities. Check your connection and try again.
      </Text>

      {onRetry && (
        <Button
          title="Retry"
          variant="primary"
          onPress={onRetry}
          style={styles.retryButton}
          accessibilityLabel="Retry loading activities"
          accessibilityHint="Retries loading the activity feed"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing[6],
    paddingVertical: tokens.spacing[10],
    gap: tokens.spacing[2.5]
  },
  alertCircle: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[2]
  },
  heading: {
    textAlign: 'center'
  },
  description: {
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 22
  },
  retryButton: {
    minWidth: 140,
    marginTop: tokens.spacing[4]
  }
});

export default ErrorState;
