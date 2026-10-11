import React from 'react';
import {
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  AccessibilityRole,
  AccessibilityState
} from 'react-native';
import { tokens } from '../theme/tokens';

export interface TappableProps {
  children: React.ReactNode;
  onPress: () => void;
  /** Required so every tappable element is announced by TalkBack / VoiceOver. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Accessible replacement for TouchableOpacity: guarantees a 48dp minimum touch
 * target, exposes role/label/state to assistive technology, and gives visual
 * press feedback.
 */
export function Tappable({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  disabled = false,
  style
}: TappableProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      style={({ pressed }) => [styles.target, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minHeight: tokens.accessibility.minTouchTarget,
    minWidth: tokens.accessibility.minTouchTarget,
    justifyContent: 'center'
  },
  pressed: {
    opacity: 0.7
  }
});
