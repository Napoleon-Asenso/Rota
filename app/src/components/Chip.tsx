import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function Chip({ label, selected = false, onPress, style }: ChipProps): React.JSX.Element {
  const { colors } = useTheme();

  const bg = selected ? colors['primary-color'] : colors['surface-variant-color'];
  const textColor = selected ? colors['on-primary-color'] : colors['on-surface-variant-color'];

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label} filter`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: bg,
          opacity: pressed ? 0.8 : 1.0
        },
        style
      ]}
    >
      <Text weight={selected ? 'semibold' : 'regular'} variant="sm" style={{ color: textColor }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    borderRadius: tokens.radius.full,
    marginRight: tokens.accessibility.touchTargetGap,
    minHeight: tokens.accessibility.minTouchTarget,
    minWidth: tokens.accessibility.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
