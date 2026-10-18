import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { tokens } from '../../theme/tokens';
import { Text } from '../Text';
import { Card } from '../Card';
import { CheckCircle2 } from 'lucide-react-native';

export interface EndOfListStateProps {
  style?: ViewStyle;
}

/**
 * Screen 15 Component: EndOfListState
 * Features:
 * - Centered circular checkmark badge in subtle green container (#E8F5E9 / #1B5E20)
 * - Heading: "You're all caught up!"
 * - Description: "No more activities to load."
 * - Subtle summary card container
 */
export function EndOfListState({ style }: EndOfListStateProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Circular Checkmark Badge */}
      <View
        style={[styles.checkCircle, { backgroundColor: '#E8F5E9' }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <CheckCircle2 size={36} color="#16A34A" />
      </View>

      <Text
        weight="bold"
        variant="2xl"
        color={colors['on-background-color']}
        style={styles.heading}
        accessibilityRole="header"
      >
        You're all caught up!
      </Text>

      <Text
        variant="base"
        color={colors['on-surface-variant-color']}
        style={styles.description}
      >
        No more activities to load.
      </Text>

      <Card
        style={styles.summaryCard}
        accessible
        accessibilityLabel="All shift creations, swap requests, and member updates for the past 30 days have been loaded."
      >
        <Text
          variant="xs"
          color={colors['on-surface-variant-color']}
          style={styles.cardText}
        >
          All shift creations, swap requests, and member updates for the past 30 days have been loaded.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing[6],
    paddingVertical: tokens.spacing[8],
    gap: tokens.spacing[2.5]
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[2]
  },
  heading: {
    textAlign: 'center'
  },
  description: {
    textAlign: 'center'
  },
  summaryCard: {
    marginTop: tokens.spacing[2],
    padding: tokens.spacing[4],
    width: '100%',
    maxWidth: 360
  },
  cardText: {
    textAlign: 'center',
    lineHeight: 18
  }
});

export default EndOfListState;
