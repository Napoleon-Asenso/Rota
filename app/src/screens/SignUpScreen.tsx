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

export function SignUpScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useAppNavigation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignUp = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await authApi.register(fullName.trim(), email.trim(), password);
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
          onChangeText={setFullName}
          accessibilityLabel="Full name"
          autoComplete="name"
          textContentType="name"
        />

        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Email address"
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Password"
          autoComplete="new-password"
          textContentType="newPassword"
          isPassword
        />

        {/* Error Notice */}
        {errorMessage ? (
          <View style={[styles.errorContainer, { backgroundColor: colors['error-container-color'] }]}>
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

        {/* Legal Terms Caption */}
        <Text
          variant="xs"
          color={colors['on-surface-variant-color']}
          style={styles.termsNote}
        >
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </Text>

        {/* Divider */}
        <View
          style={styles.dividerRow}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            style={[styles.dividerLine, { backgroundColor: colors['outline-variant-color'] }]}
          />
          <Text variant="xs" color={colors['outline-color']} style={styles.dividerText}>
            OR
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: colors['outline-variant-color'] }]}
          />
        </View>

        {/* Continue with Google */}
        <Button
          title="Continue with Google"
          variant="outline"
          onPress={handleSignUp}
          style={styles.googleButton}
          accessibilityLabel="Continue with Google"
          accessibilityHint="Sign up using your Google account"
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
    padding: tokens.spacing[2],
    borderRadius: tokens.borderRadius['radius-md'],
    marginTop: tokens.spacing[1]
  },
  submitButton: {
    marginTop: tokens.spacing[2]
  },
  termsNote: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: tokens.spacing[2]
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: tokens.spacing[2]
  },
  dividerLine: {
    flex: 1,
    height: 1
  },
  dividerText: {
    marginHorizontal: tokens.spacing[3]
  },
  googleButton: {
    width: '100%'
  },
  loginLink: {
    minHeight: tokens.accessibility.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing[2],
    paddingVertical: tokens.spacing[2]
  }
});
