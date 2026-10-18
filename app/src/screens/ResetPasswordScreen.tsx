import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAppNavigation } from '../navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { authApi } from '../services/api';
import { validateEmailRealtime, validateEmailSubmit } from '../utils/validators';

/**
 * Screen 20: Reset Password Screen
 * Features:
 * - Back arrow navigation (44pt touch target)
 * - Email address validation
 * - Clear error text without background color container
 * - Success confirmation message
 * - Return to Log In link
 */
export function ResetPasswordScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useAppNavigation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleEmailChange = (text: string): void => {
    setEmail(text);
    if (errorMessage) setErrorMessage(null);
    setEmailError(validateEmailRealtime(text));
  };

  const handleResetPassword = async (): Promise<void> => {
    const emailErr = validateEmailSubmit(email);
    if (emailErr) {
      setEmailError(emailErr);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await authApi.requestPasswordReset(email.trim());
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg =
        errorObj.response?.data?.error?.message ||
        errorObj.message ||
        'Unable to send reset instructions. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { backgroundColor: colors['background-color'] }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Bar with Back Arrow */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to previous screen"
          accessibilityHint="Navigates back to log in"
          hitSlop={8}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors['on-background-color']} />
        </Pressable>
      </View>

      {/* Screen Header */}
      <View style={styles.header}>
        <Text
          weight="bold"
          variant="3xl"
          color={colors['on-background-color']}
          accessibilityRole="header"
        >
          Reset password
        </Text>
        <Text
          variant="base"
          color={colors['on-surface-variant-color']}
          style={styles.subtitle}
        >
          Enter the email address associated with your account and we&apos;ll send you instructions to reset your password.
        </Text>
      </View>

      {isSuccess ? (
        <View style={styles.successState}>
          <CheckCircle2 size={48} color={colors['primary-color']} style={styles.successIcon} />
          <Text weight="bold" variant="xl" color={colors['on-background-color']} style={styles.successHeading}>
            Check your email
          </Text>
          <Text variant="base" color={colors['on-surface-variant-color']} style={styles.successDescription}>
            We have sent password reset instructions to{' '}
            <Text weight="medium" color={colors['on-background-color']}>
              {email}
            </Text>
            . Please check your inbox and spam folder.
          </Text>

          <Button
            title="Back to Log In"
            variant="primary"
            onPress={() => navigation.goToLogin()}
            style={styles.successBackButton}
            accessibilityLabel="Back to Log In"
          />
        </View>
      ) : (
        /* Reset Password Form */
        <View style={styles.form}>
          <Input
            label="Email Address"
            value={email}
            onChangeText={handleEmailChange}
            error={emailError || undefined}
            accessibilityLabel="Email address"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Error Notice - Text alone without background color */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text variant="sm" color={colors['error-color']} weight="medium">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Primary Action Button */}
          <Button
            title={isLoading ? 'Sending instructions...' : 'Send Reset Link'}
            variant="primary"
            onPress={handleResetPassword}
            loading={isLoading}
            style={styles.submitButton}
            accessibilityLabel="Send Reset Link"
            accessibilityHint="Sends password reset instructions to your email"
          />

          {/* Link to Login */}
          <Pressable
            onPress={() => navigation.goToLogin()}
            accessibilityRole="link"
            accessibilityLabel="Remember your password? Log In"
            style={styles.loginLink}
          >
            <Text variant="sm" color={colors['on-surface-variant-color']}>
              Remember your password?{' '}
              <Text weight="semibold" variant="sm" color={colors['primary-color']}>
                Log In
              </Text>
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    minHeight: '100%',
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[4],
    paddingBottom: tokens.spacing[8]
  },
  topBar: {
    marginBottom: tokens.spacing[4],
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    width: tokens.accessibility.minTouchTarget,
    height: tokens.accessibility.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  header: {
    marginBottom: tokens.spacing[6],
    maxWidth: tokens.layout.heroMaxWidth,
    width: '100%'
  },
  subtitle: {
    marginTop: tokens.spacing[1.5],
    flexWrap: 'wrap'
  },
  form: {
    gap: tokens.spacing[4]
  },
  errorContainer: {
    marginTop: tokens.spacing[1]
  },
  submitButton: {
    marginTop: tokens.spacing[2]
  },
  loginLink: {
    minHeight: tokens.accessibility.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing[2],
    paddingVertical: tokens.spacing[2]
  },
  successState: {
    alignItems: 'center',
    paddingVertical: tokens.spacing[8],
    gap: tokens.spacing[3]
  },
  successIcon: {
    marginBottom: tokens.spacing[2]
  },
  successHeading: {
    textAlign: 'center'
  },
  successDescription: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: tokens.spacing[4]
  },
  successBackButton: {
    width: '100%',
    marginTop: tokens.spacing[4]
  }
});

export default ResetPasswordScreen;
