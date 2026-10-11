import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Tappable } from '../components/Tappable';
import { EmptyState } from '../components/feed/EmptyState';
import { useAppStore } from '../storage/store';

/**
 * Screen 14: Activity Feed Empty State Screen
 */
export function FeedEmptyStateScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  return (
    <View style={[styles.container, { backgroundColor: colors['background-color'] }]}>
      <Tappable
        onPress={() => setCurrentScreenId(8)}
        accessibilityLabel="Back to activity feed"
        style={styles.backButton}
      >
        <Text weight="semibold" variant="sm" color={colors['primary-color']}>
          ← Back to Activity Feed
        </Text>
      </Tappable>

      <EmptyState onRefresh={() => setCurrentScreenId(8)} />

      <View style={styles.navigationRow}>
        <Tappable
          onPress={() => setCurrentScreenId(15)}
          accessibilityRole="link"
          accessibilityLabel="Next state: End of List (Screen 15)"
        >
          <Text variant="sm" weight="semibold" color={colors['primary-color']}>
            Next State: End of List (Screen 15) →
          </Text>
        </Tappable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[12],
    paddingBottom: tokens.spacing[8],
    justifyContent: 'space-between'
  },
  backButton: {
    minHeight: tokens.accessibility.minTouchTarget,
    justifyContent: 'center'
  },
  navigationRow: {
    alignItems: 'center',
    paddingVertical: tokens.spacing[4]
  }
});

export default FeedEmptyStateScreen;
