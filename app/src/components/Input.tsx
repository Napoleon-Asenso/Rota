import React, { useState, useId, useRef, useImperativeHandle } from 'react';
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
  headerRight?: React.ReactNode;
  floatingLabel?: boolean;
  error?: string;
  required?: boolean;
  requiredMessage?: string;
  autoTrim?: boolean;
  helperText?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  ariaDescribedBy?: string;
}

/**
 * Accessible Input primitive matching design tokens:
 * - Programmatically connected labels via nativeID, aria-labelledby, and tap-to-focus
 * - Automatically trims leading spaces in real time and trailing spaces on blur
 * - Screen-reader aria-describedby and accessibilityHint bindings
 * - Client-side validation: displays error beneath input when field is left empty after focus
 * - Error stroke matches design system error token
 * - Standard or Floating label
 * - Optional headerRight slot (e.g. for "Forgot password?") aligned with standard label
 * - Password visibility toggle with 44pt touch target
 * - Semantic error state & helper text
 * - WCAG minimum 44pt touch height
 */
export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  {
    id,
    nativeID,
    label,
    headerRight,
    floatingLabel = false,
    error,
    required = true,
    requiredMessage,
    autoTrim = true,
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
    ariaDescribedBy,
    secureTextEntry,
    onFocus,
    onBlur,
    ...rest
  },
  ref
): React.JSX.Element {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [internalValue, setInternalValue] = useState<string>(
    rest.defaultValue ? String(rest.defaultValue) : ''
  );
  const internalInputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => internalInputRef.current as TextInput);

  const fallbackId = useId();
  const inputId = id || nativeID || `input-${fallbackId.replace(/:/g, '')}`;
  const labelId = `${inputId}-label`;

  const isActuallyPassword = isPassword || secureTextEntry;
  const isMasked = isActuallyPassword && !passwordVisible;
  const currentValue = value !== undefined ? value : internalValue;
  const hasValue = Boolean(
    currentValue !== undefined && currentValue !== null && String(currentValue).trim().length > 0
  );
  const isFloated = floatingLabel && (isFocused || hasValue);

  // Client-side validation: display error message when nothing is entered after focusing
  const isBlankAfterFocus = required && touched && !hasValue;
  const computedError =
    error || (isBlankAfterFocus ? (requiredMessage || `${label || 'This field'} is required.`) : undefined);

  // Background styling:
  // Background is removed ('transparent') across all states, including when forms are filled out
  const inputBgColor = 'transparent';

  // Stroke color from design system tokens (colors['error-color'])
  const borderColor = computedError
    ? colors['error-color']
    : isFocused
    ? colors['primary-color']
    : colors['outline-variant-color'];

  const togglePasswordVisibility = (): void => {
    setPasswordVisible((prev) => !prev);
  };

  const handleLabelPress = (): void => {
    internalInputRef.current?.focus();
  };

  return (
    <View style={[styles.rootContainer, containerStyle]}>
      {/* Standard Label Row */}
      {label && !floatingLabel && (
        <View style={styles.labelRow}>
          <Pressable
            onPress={handleLabelPress}
            accessibilityRole="none"
            hitSlop={4}
            style={styles.labelPressable}
            {...(Platform.OS === 'web' ? ({ htmlFor: inputId } as any) : {})}
          >
            <Text
              id={labelId}
              nativeID={labelId}
              weight="medium"
              variant="sm"
              color={colors['on-surface-color']}
              style={styles.standardLabel}
            >
              {label}
            </Text>
          </Pressable>
          {headerRight && <View style={styles.headerRightContainer}>{headerRight}</View>}
        </View>
      )}
      {!label && !floatingLabel && headerRight && (
        <View style={[styles.labelRow, styles.labelRowRightOnly]}>
          <View style={styles.headerRightContainer}>{headerRight}</View>
        </View>
      )}

      {/* Input Box Wrapper */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: inputBgColor,
            borderColor,
            borderWidth: isFocused || computedError ? 1.5 : 1
          }
        ]}
      >
        {/* Floating Label */}
        {label && floatingLabel && (
          <Pressable
            onPress={handleLabelPress}
            accessibilityRole="none"
            style={[
              styles.floatingLabelWrapper,
              isFloated ? styles.floatingLabelActive : styles.floatingLabelResting
            ]}
            {...(Platform.OS === 'web' ? ({ htmlFor: inputId } as any) : {})}
          >
            <Text
              id={labelId}
              nativeID={labelId}
              variant={isFloated ? 'xs' : 'base'}
              weight="medium"
              color={
                computedError
                  ? colors['error-color']
                  : isFocused
                  ? colors['primary-color']
                  : colors['outline-color']
              }
              style={styles.floatingLabelText}
            >
              {label}
            </Text>
          </Pressable>
        )}

        {/* Optional Left Icon */}
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}

        {/* Native Text Input */}
        <TextInput
          ref={internalInputRef}
          id={inputId}
          nativeID={inputId}
          aria-labelledby={label ? labelId : undefined}
          value={value}
          onChangeText={(text) => {
            // Trim leading empty spaces at the beginning of input fields
            const sanitizedText = autoTrim ? text.replace(/^\s+/, '') : text;
            if (value === undefined) {
              setInternalValue(sanitizedText);
            }
            onChangeText?.(sanitizedText);
          }}
          placeholder={floatingLabel && !isFloated ? undefined : placeholder}
          placeholderTextColor={colors['outline-color']}
          secureTextEntry={isMasked}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            setTouched(true);

            // Trim trailing spaces at the end when leaving the input field
            if (autoTrim && typeof currentValue === 'string') {
              const trimmed = currentValue.trim();
              if (trimmed !== currentValue) {
                if (value === undefined) {
                  setInternalValue(trimmed);
                }
                onChangeText?.(trimmed);
              }
            }

            onBlur?.(e);
          }}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={
            computedError
              ? `Error: ${computedError}. ${accessibilityHint || ''}`.trim()
              : accessibilityHint
          }
          aria-invalid={Boolean(computedError)}
          aria-describedby={ariaDescribedBy}
          {...(Platform.OS === 'web' && ariaDescribedBy ? ({ 'aria-describedby': ariaDescribedBy } as any) : {})}
          textAlignVertical="center"
          style={[
            styles.nativeInput,
            { color: colors['on-surface-color'] },
            floatingLabel ? { paddingTop: isFloated ? 18 : 10, paddingBottom: 0 } : null,
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

      {/* Error Message beneath input field */}
      {computedError ? (
        <View style={styles.errorContainer} accessible accessibilityRole="alert">
          <Text variant="xs" weight="medium" color={colors['error-color']} style={styles.errorText}>
            {computedError}
          </Text>
        </View>
      ) : helperText ? (
        <Text variant="xs" color={colors['outline-color']} style={styles.helperText}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  rootContainer: {
    width: '100%',
    gap: tokens.spacing[1.5]
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing[0.5]
  },
  labelRowRightOnly: {
    justifyContent: 'flex-end'
  },
  labelPressable: {
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {})
  },
  standardLabel: {
    marginBottom: 0
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center'
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
    height: tokens.accessibility.minTouchTarget,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {})
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
  floatingLabelWrapper: {
    position: 'absolute',
    left: tokens.spacing[4],
    zIndex: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {})
  },
  floatingLabelText: {},
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

