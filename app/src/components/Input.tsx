import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from './Text';
import { Eye, EyeOff } from 'lucide-react-native';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  floatingLabel?: boolean;
  error?: string;
  helperText?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}



/**
 * Accessible Input primitive matching design tokens:
 * - Standard or Floating label
 * - Password visibility toggle with 44pt touch target
 * - Semantic error state & helper text
 * - WCAG minimum 44pt touch height
 */
export function Input({
  label,
  floatingLabel = false,
  error,
  helperText,
  isPassword = false,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  accessibilityHint,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: InputProps): React.JSX.Element {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);

  const isActuallyPassword = isPassword || secureTextEntry;
  const isMasked = isActuallyPassword && !passwordVisible;
  const hasValue = Boolean(value && String(value).length > 0);
  const isFloated = floatingLabel && (isFocused || hasValue);

  const borderColor = error
    ? '#EF4444' // Error state
    : isFocused
    ? colors['primary-color'] // Focus state
    : colors['outline-variant-color']; // Default border

  const togglePasswordVisibility = (): void => {
    setPasswordVisible((prev) => !prev);
  };

  return (
    <View style={[styles.rootContainer, containerStyle]}>
      {/* Standard Label */}
      {label && !floatingLabel && (
        <Text
          weight="medium"
          variant="sm"
          color={colors['on-surface-color']}
          style={styles.standardLabel}
        >
          {label}
        </Text>
      )}

      {/* Input Box Wrapper */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors['surface-container-lowest-color'],
            borderColor,
            borderWidth: isFocused || error ? 1.5 : 1
          }
        ]}
      >
        {/* Floating Label */}
        {label && floatingLabel && (
          <Text
            variant={isFloated ? 'xs' : 'base'}
            weight="medium"
            color={
              error
                ? '#EF4444'
                : isFocused
                ? colors['primary-color']
                : colors['outline-color']
            }
            style={[
              styles.floatingLabelText,
              isFloated ? styles.floatingLabelActive : styles.floatingLabelResting
            ]}
          >
            {label}
          </Text>
        )}

        {/* Optional Left Icon */}
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}

        {/* Native Text Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={floatingLabel && !isFloated ? undefined : placeholder}
          placeholderTextColor={colors['outline-color']}
          secureTextEntry={isMasked}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={error ? `Error: ${error}. ${accessibilityHint || ''}`.trim() : accessibilityHint}
          aria-invalid={Boolean(error)}
          style={[
            styles.nativeInput,
            {
              color: colors['on-surface-color'],
              paddingTop: floatingLabel ? (isFloated ? 18 : 10) : 0
            },
            inputStyle
          ]}
          {...rest}
        />

        {/* Password Toggle Button (44pt touch target) */}
        {isActuallyPassword && (
          <Pressable
            onPress={togglePasswordVisibility}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityHint="Toggles password visibility"
            hitSlop={8}
            style={styles.toggleButton}
          >
            {passwordVisible ? (
              <EyeOff size={20} color={colors['primary-color']} />
            ) : (
              <Eye size={20} color={colors['outline-color']} />
            )}
          </Pressable>
        )}

        {/* Optional Right Icon (when not password toggle) */}
        {!isActuallyPassword && rightIcon && (
          <View style={styles.rightIconWrapper}>{rightIcon}</View>
        )}
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer} accessible accessibilityRole="alert">
          <Text variant="xs" weight="medium" color="#EF4444" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : helperText ? (
        <Text variant="xs" color={colors['outline-color']} style={styles.helperText}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    width: '100%',
    gap: tokens.spacing[1.5]
  },
  standardLabel: {
    marginBottom: tokens.spacing[0.5]
  },
  inputWrapper: {
    position: 'relative',
    minHeight: tokens.accessibility.minTouchTarget, // 44pt minimum touch target
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing[4],
    overflow: 'hidden'
  },
  nativeInput: {
    flex: 1,
    minHeight: tokens.accessibility.minTouchTarget,
    fontSize: tokens.typography.size.base,
    fontFamily: tokens.typography.fontFamily.sans,
    paddingVertical: Platform.OS === 'ios' ? tokens.spacing[3] : tokens.spacing[2],
    paddingHorizontal: 0
  },
  leftIconWrapper: {
    marginRight: tokens.spacing[2],
    justifyContent: 'center',
    alignItems: 'center'
  },
  rightIconWrapper: {
    marginLeft: tokens.spacing[2],
    justifyContent: 'center',
    alignItems: 'center'
  },
  toggleButton: {
    minWidth: tokens.accessibility.minTouchTarget,
    minHeight: tokens.accessibility.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: tokens.spacing[1]
  },
  floatingLabelText: {
    position: 'absolute',
    left: tokens.spacing[4],
    zIndex: 1
  },
  floatingLabelResting: {
    top: 14
  },
  floatingLabelActive: {
    top: 4
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.spacing[0.5]
  },
  errorText: {
    lineHeight: 16
  },
  helperText: {
    marginTop: tokens.spacing[0.5],
    lineHeight: 16
  }
});

export default Input;

