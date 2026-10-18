import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { tokens } from '../../theme/tokens';
import { Text } from '../Text';
import { Button } from '../Button';
import { ClipboardList } from 'lucide-react-native';

export interface EmptyStateProps {
  onRefresh?: () => void;
  style?: ViewStyle;
}

/**
 * Screen 14 Component: EmptyState
 * Features:
 * - Clean document / clipboard illustration icon
 * - Heading: "No activities yet"
 * - Description: "When something happens, you'll see it here."
 * - Action button: "Refresh" in primary-color
 */
export function EmptyState({ onRefresh, style }: EmptyStateProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Clean Document/Clipboard Icon Container */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors['surface-variant-color'] }
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ClipboardList size={36} color={colors['primary-color']} />
      </View>

      <Text
        weight="bold"
        variant="2xl"
        color={colors['on-background-color']}
        style={styles.heading}
        accessibilityRole="header"
      >
        No activities yet
      </Text>

      <Text
        variant="base"
        color={colors['on-surface-variant-color']}
        style={styles.description}
      >
        When something happens, you'll see it here.
      </Text>

      {onRefresh && (
        <Button
          title="Refresh"
          variant="primary"
          onPress={onRefresh}
          style={styles.refreshButton}
          accessibilityLabel="Refresh activities"
          accessibilityHint="Refreshes the activity feed"
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
    gap: tokens.spacing[2]
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[3]
  },
  clipboardBody: {
    width: 36,
    height: 44,
    borderRadius: tokens.radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    gap: 4
  },
  clipboardClip: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 6,
    borderRadius: 3
  },
  clipboardLine: {
    width: 20,
    height: 2.5,
    borderRadius: 1.5
  },
  clipboardLineShort: {
    width: 14,
    height: 2.5,
    borderRadius: 1.5
  },
  heading: {
    textAlign: 'center'
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22
  },
  refreshButton: {
    minWidth: 140,
    marginTop: tokens.spacing[4]
  }
});

export default EmptyState;
