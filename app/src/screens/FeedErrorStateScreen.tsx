import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Tappable } from '../components/Tappable';
import { ErrorState } from '../components/feed/ErrorState';
import { useAppStore } from '../storage/store';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

/**
 * Screen 16: Activity Feed Error State Screen
 */
export function FeedErrorStateScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  return (
    <View style={[styles.container, { backgroundColor: colors['background-color'] }]}>
      <Tappable
        onPress={() => setCurrentScreenId(8)}
        accessibilityLabel="Back to activity feed"
        style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
      >
        <ArrowLeft size={16} color={colors['primary-color']} />
        <Text weight="semibold" variant="sm" color={colors['primary-color']}>
          Back to Activity Feed
        </Text>
      </Tappable>

      <ErrorState onRetry={() => setCurrentScreenId(8)} />

      <View style={styles.navigationRow}>
        <Tappable
          onPress={() => setCurrentScreenId(17)}
          accessibilityRole="link"
          accessibilityLabel="Next state: Infinite Scroll (Screen 17)"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text variant="sm" weight="semibold" color={colors['primary-color']}>
            Next State: Infinite Scroll (Screen 17)
          </Text>
          <ArrowRight size={16} color={colors['primary-color']} />
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

export default FeedErrorStateScreen;
