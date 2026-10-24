import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAppNavigation } from '../navigation';
import { useAppStore } from '../storage/store';
import { ArrowLeft } from 'lucide-react-native';

/**
 * Screen 3: Log In Screen
 * Visual source of truth: 19-screen reference layout.
 * Features:
 * - Back arrow navigation (44pt touch target)
 * - Accessible Input fields with password toggle
 * - "Forgot password?" action
 * - Navigation to Dashboard upon authentication
 */
import { authApi } from '../services/api';
import { validateEmailRealtime, validateEmailSubmit } from '../utils/validators';

export function LoginScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useAppNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailChange = (text: string): void => {
    setEmail(text);
    if (errorMessage) setErrorMessage(null);
    setEmailError(validateEmailRealtime(text));
  };

  const handleLogin = async (): Promise<void> => {
    let hasError = false;
    const emailErr = validateEmailSubmit(email);
    if (emailErr) {
      setEmailError(emailErr);
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await authApi.login(email.trim(), password.trim());
      useAppStore.getState().setUserEmail(email.trim());
      navigation.goToDashboard();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg =
        errorObj.response?.data?.error?.message ||
        errorObj.message ||
        'Invalid email or password. Please try again.';
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
          accessibilityHint="Navigates back to the welcome splash screen"
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
          Welcome back
        </Text>
        <Text
          variant="base"
          color={colors['on-surface-variant-color']}
          style={styles.subtitle}
        >
          Log in to your Rota account.
        </Text>
      </View>

      {/* Login Form */}
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

        <Input
          label="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError) setPasswordError(null);
            if (errorMessage) setErrorMessage(null);
          }}
          error={passwordError || undefined}
          accessibilityLabel="Password"
          autoComplete="current-password"
          textContentType="password"
          isPassword
          headerRight={
            <Pressable
              onPress={() => navigation.goToResetPassword()}
              accessibilityRole="link"
              accessibilityLabel="Forgot password?"
              accessibilityHint="Navigates to password reset"
              style={styles.forgotLink}
            >
              <Text variant="sm" weight="medium" color={colors['primary-color']}>
                Forgot password?
              </Text>
            </Pressable>
          }
        />

        {/* Error Notice */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text variant="sm" color={colors['error-color']} weight="medium">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Primary Action Button */}
        <Button
          title={isLoading ? 'Logging in...' : 'Log In'}
          variant="primary"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.submitButton}
          accessibilityLabel="Log In"
          accessibilityHint="Logs in to your account and takes you to your shift calendar"
        />

        {/* Link to Sign Up */}
        <Pressable
          onPress={() => navigation.goToSignUp()}
          accessibilityRole="link"
          accessibilityLabel="Don't have an account? Sign Up"
          style={styles.signUpLink}
        >
          <Text variant="sm" color={colors['on-surface-variant-color']}>
            Don't have an account?{' '}
            <Text weight="semibold" variant="sm" color={colors['primary-color']}>
              Sign Up
            </Text>
          </Text>
        </Pressable>
      </View>
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
  arrowIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  arrowShaft: {
    width: 16,
    height: 2,
    borderRadius: 1
  },
  arrowHeadUpper: {
    position: 'absolute',
    left: 4,
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    transform: [{ rotate: '-45deg' }]
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
  forgotLink: {
    minHeight: tokens.accessibility.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing[1]
  },
  errorContainer: {
    marginTop: tokens.spacing[1]
  },
  submitButton: {
    marginTop: tokens.spacing[2]
  },
  signUpLink: {
    minHeight: tokens.accessibility.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing[2],
    paddingVertical: tokens.spacing[2]
  }
});
