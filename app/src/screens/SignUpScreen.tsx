import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAppNavigation } from '../navigation';
import { ArrowLeft } from 'lucide-react-native';

/**
 * Screen 2: Sign Up Screen
 * Visual source of truth: 19-screen reference layout.
 * Features:
 * - Back arrow navigation (44pt touch target)
 * - Accessible Input fields with password visibility toggle
 * - Navigation to Invite Team Members on submission
 */
import { authApi } from '../services/api';

import { validateEmailRealtime, validateEmailSubmit } from '../utils/validators';

export function SignUpScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useAppNavigation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateFullName = (text: string): string | null => {
    // 1. Only letters and spaces are allowed
    if (/[^a-zA-Z\s]/.test(text)) {
      return 'Name can only contain letters and spaces.';
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return 'Full Name is required';
    }

    const words = trimmed.split(/\s+/).filter(Boolean);

    // Check for empty string / spaces after the first word with no new word entered yet
    if (words.length === 1 && text.length > words[0].length) {
      return 'Please enter a second word after the first name.';
    }

    // Ensure at least two words are entered
    if (words.length < 2) {
      return 'Please enter at least two words (e.g. First and Last name).';
    }

    return null;
  };

  const handleFullNameChange = (text: string): void => {
    setFullName(text);
    if (errorMessage) setErrorMessage(null);

    // 1. Check for invalid characters in real time
    if (/[^a-zA-Z\s]/.test(text)) {
      setFullNameError('Name can only contain letters and spaces.');
      return;
    }

    // 2. Check for empty string / space after the last character of first word with no second word yet
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1 && text.length > words[0].length) {
      setFullNameError('Please enter a second word after the first name.');
      return;
    }

    // 3. Clear error as soon as at least two valid words are present
    if (words.length >= 2) {
      setFullNameError(null);
    } else if (fullNameError && fullNameError !== 'Full Name is required') {
      setFullNameError(null);
    }
  };

  const handleEmailChange = (text: string): void => {
    setEmail(text);
    if (errorMessage) setErrorMessage(null);
    setEmailError(validateEmailRealtime(text));
  };

  const handleSignUp = async (): Promise<void> => {
    let hasError = false;
    const nameErr = validateFullName(fullName);
    if (nameErr) {
      setFullNameError(nameErr);
      hasError = true;
    } else {
      setFullNameError(null);
    }

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

      // Parse first name, middle name, and last name for edge cases
      const words = fullName.trim().split(/\s+/).filter(Boolean);
      const firstName = words[0] || fullName.trim();
      const lastName = words.length > 1 ? words[words.length - 1] : '';
      const middleName = words.length > 2 ? words.slice(1, -1).join(' ') : null;

      await authApi.register(fullName.trim(), email.trim(), password.trim(), undefined, {
        firstName,
        middleName,
        lastName
      });
      navigation.goToInviteMembers();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg =
        errorObj.response?.data?.error?.message ||
        errorObj.message ||
        'Registration failed. Please check your information.';
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
          Create your account
        </Text>
        <Text
          variant="base"
          color={colors['on-surface-variant-color']}
          style={styles.subtitle}
        >
          Get started with Rota in seconds.
        </Text>
      </View>

      {/* Sign Up Form */}
      <View style={styles.form}>
        <Input
          label="Full Name"
          value={fullName}
          onChangeText={handleFullNameChange}
          error={fullNameError || undefined}
          accessibilityLabel="Full name"
          autoComplete="name"
          textContentType="name"
        />

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
          autoComplete="new-password"
          textContentType="newPassword"
          isPassword
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
          title={isLoading ? 'Creating account...' : 'Sign Up'}
          variant="primary"
          onPress={handleSignUp}
          loading={isLoading}
          style={styles.submitButton}
          accessibilityLabel="Sign Up"
          accessibilityHint="Creates your account and navigates to invite team members"
        />

        {/* Link to Login */}
        <Pressable
          onPress={() => navigation.goToLogin()}
          accessibilityRole="link"
          accessibilityLabel="Already have an account? Log In"
          style={styles.loginLink}
        >
          <Text variant="sm" color={colors['on-surface-variant-color']}>
            Already have an account?{' '}
            <Text weight="semibold" variant="sm" color={colors['primary-color']}>
              Log In
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
  }
});
