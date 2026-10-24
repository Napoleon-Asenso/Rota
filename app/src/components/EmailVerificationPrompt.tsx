import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from './Text';
import { Button } from './Button';
import { useAppStore } from '../storage/store';
import { authApi } from '../services/api';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, X, Shield, ArrowLeft } from 'lucide-react-native';

export interface EmailVerificationPromptProps {
  email?: string;
  onVerified?: () => void;
  onDismiss?: () => void;
}

/**
 * EmailVerificationPrompt Component
 * Rendered on the primary dashboard (Shift Calendar Screen).
 *
 * Requirements:
 * 1. Does NOT ask users to enter their email address (uses authenticated account email).
 * 2. Initially displays an optional invitation asking whether the user wants to verify their email.
 * 3. Highlights that email verification is completely OPTIONAL / NOT COMPULSORY.
 * 4. Offers clear actions: "Yes, Verify Email" to proceed or "Maybe Later" to dismiss without penalty.
 * 5. Entering the code verification step allows inputting the 4-digit code dispatched to their email.
 */
export function EmailVerificationPrompt({
  email: propEmail,
  onVerified,
  onDismiss
}: EmailVerificationPromptProps): React.JSX.Element | null {
  const { colors } = useTheme();
  const {
    userEmail,
    isEmailVerified,
    showVerificationPrompt,
    setIsEmailVerified,
    setShowVerificationPrompt
  } = useAppStore();

  const activeEmail = propEmail || userEmail || 'your registered email';

  // State: 'ask' (initial question whether to verify) vs 'enter_code' (entering the 4-digit code)
  const [step, setStep] = useState<'ask' | 'enter_code'>('ask');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // If already verified or dismissed, do not render
  if (isEmailVerified || (!showVerificationPrompt && !propEmail)) {
    return null;
  }

  // Handle cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleStartVerification = async (): Promise<void> => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStep('enter_code');

    // Attempt sending or refreshing verification code if cooldown has expired
    if (activeEmail && activeEmail !== 'your registered email' && cooldown === 0) {
      try {
        await authApi.sendVerificationEmail(activeEmail);
        setCooldown(60);
      } catch {
        // If code was already sent during registration, failure to resend immediately is non-blocking
      }
    }
  };

  const handleVerify = async (): Promise<void> => {
    const trimmed = code.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      setErrorMessage('Please enter a valid 4-digit verification code.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await authApi.verifyEmail(activeEmail, trimmed);
      if (res.success) {
        setIsEmailVerified(true);
        setSuccessMessage('Email verified successfully! Your account is fully protected.');
        if (onVerified) onVerified();

        // Auto dismiss after 2.5 seconds
        setTimeout(() => {
          setShowVerificationPrompt(false);
        }, 2500);
      }
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } } };
        message?: string;
      };
      const msg =
        errorObj.response?.data?.error?.message ||
        errorObj.message ||
        'Invalid or expired verification code. Please check and try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (cooldown > 0 || isResending) return;

    try {
      setIsResending(true);
      setErrorMessage(null);
      await authApi.sendVerificationEmail(activeEmail);
      setCooldown(60);
      setSuccessMessage('A fresh 4-digit code was sent to your email.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string; details?: { cooldownRemaining?: number } } } };
        message?: string;
      };
      const remaining = errorObj.response?.data?.error?.details?.cooldownRemaining;
      if (remaining) {
        setCooldown(remaining);
      }
      const msg =
        errorObj.response?.data?.error?.message ||
        errorObj.message ||
        'Unable to resend code right now. Please wait a moment.';
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = (): void => {
    setShowVerificationPrompt(false);
    if (onDismiss) onDismiss();
  };

  // --------------------------------------------------------------------------
  // STEP 1: INVITATION / QUESTION COMPONENT (Optional, Not Compulsory)
  // --------------------------------------------------------------------------
  if (step === 'ask') {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors['surface-container-lowest-color'],
            borderColor: colors['primary-color']
          }
        ]}
        accessibilityLabel="Email verification inquiry"
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.iconTitleContainer}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors['primary-color']}1A` }]}>
              <Mail size={18} color={colors['primary-color']} />
            </View>
            <View style={styles.titleWrap}>
              <Text weight="bold" variant="sm" color={colors['on-surface-color']}>
                Verify Your Email?
              </Text>
              <View style={styles.optionalPill}>
                <Shield size={11} color="#4cc9f0" style={{ marginRight: 4 }} />
                <Text variant="xs" weight="semibold" color="#4cc9f0">
                  OPTIONAL • NOT COMPULSORY
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Dismiss verification inquiry"
            hitSlop={8}
          >
            <X size={16} color={colors['on-surface-variant-color']} />
          </Pressable>
        </View>

        {/* Explanation */}
        <Text variant="xs" color={colors['on-surface-variant-color']} style={styles.description}>
          Would you like to verify <Text weight="semibold" color={colors['on-surface-color']}>{activeEmail}</Text>? It helps secure your account and recover passwords, but <Text weight="semibold" color={colors['primary-color']}>it is not compulsory</Text> to use Rota.
        </Text>

        {/* Actions Row */}
        <View style={styles.actionButtonsRow}>
          <Button
            title="Yes, Verify Email"
            variant="primary"
            onPress={handleStartVerification}
            style={styles.actionButtonPrimary}
          />

          <Pressable
            onPress={handleClose}
            style={styles.actionButtonSecondary}
            accessibilityRole="button"
            accessibilityLabel="Maybe later, dismiss email verification"
            hitSlop={6}
          >
            <Text variant="xs" weight="semibold" color={colors['on-surface-variant-color']}>
              Maybe Later
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 2: CODE VERIFICATION COMPONENT (Entering 4-digit single-use code)
  // --------------------------------------------------------------------------
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-container-lowest-color'],
          borderColor: colors['primary-color']
        }
      ]}
      accessibilityLabel="Email verification code entry"
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.iconTitleContainer}>
          <Pressable
            onPress={() => setStep('ask')}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back to verification inquiry"
            hitSlop={6}
          >
            <ArrowLeft size={16} color={colors['primary-color']} />
          </Pressable>

          <View style={styles.titleWrap}>
            <Text weight="bold" variant="sm" color={colors['on-surface-color']}>
              Enter 4-Digit Code
            </Text>
            <Text variant="xs" color={colors['on-surface-variant-color']} numberOfLines={1}>
              Sent to {activeEmail}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss verification prompt"
          hitSlop={8}
        >
          <X size={16} color={colors['on-surface-variant-color']} />
        </Pressable>
      </View>

      {/* Description */}
      <Text variant="xs" color={colors['on-surface-variant-color']} style={styles.description}>
        Enter the four-digit verification code sent to your email. You can skip this anytime:
      </Text>

      {/* Success Notification */}
      {successMessage && (
        <View style={[styles.feedbackBox, { backgroundColor: '#102a1d', borderColor: '#1b6338' }]}>
          <CheckCircle2 size={16} color="#4ade80" />
          <Text variant="xs" weight="medium" color="#4ade80" style={styles.feedbackText}>
            {successMessage}
          </Text>
        </View>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <View style={[styles.feedbackBox, { backgroundColor: '#311015', borderColor: '#68202a' }]}>
          <AlertCircle size={16} color="#f87171" />
          <Text variant="xs" weight="medium" color="#f87171" style={styles.feedbackText}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* 4-Digit Verification Form */}
      <View style={styles.formRow}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors['surface-variant-color'],
              borderColor: code.length === 4 ? colors['primary-color'] : colors['outline-color']
            }
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors['on-background-color'] }]}
            value={code}
            onChangeText={(text) => {
              // Only allow digits, max length 4
              const numeric = text.replace(/[^0-9]/g, '').slice(0, 4);
              setCode(numeric);
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            placeholderTextColor={colors['outline-color']}
            accessible={true}
            accessibilityLabel="Four digit verification code"
            accessibilityHint="Enter the 4-digit code sent to your email"
          />
        </View>

        <Button
          title={isLoading ? 'Verifying...' : 'Verify'}
          variant="primary"
          disabled={code.length !== 4 || isLoading}
          onPress={handleVerify}
          style={styles.verifyButton}
        />
      </View>

      {/* Resend & Status Footer */}
      <View style={styles.footerRow}>
        <Pressable
          onPress={handleResend}
          disabled={cooldown > 0 || isResending}
          style={styles.resendBtn}
          accessibilityRole="button"
          accessibilityLabel="Resend email verification code"
        >
          {isResending ? (
            <ActivityIndicator size="small" color={colors['primary-color']} style={{ marginRight: 6 }} />
          ) : (
            <RefreshCw size={13} color={cooldown > 0 ? colors['outline-color'] : colors['primary-color']} style={{ marginRight: 6 }} />
          )}
          <Text
            variant="xs"
            weight="medium"
            color={cooldown > 0 ? colors['outline-color'] : colors['primary-color']}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
          </Text>
        </Pressable>

        <View style={styles.secureBadge}>
          <Shield size={12} color="#10b981" />
          <Text variant="xs" color="#10b981" weight="semibold" style={{ marginLeft: 4 }}>
            One-Time Code
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: tokens.spacing[4],
    marginTop: tokens.spacing[3],
    marginBottom: tokens.spacing[3],
    borderRadius: tokens.radius.xl,
    borderWidth: 1.5,
    padding: tokens.spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing[2]
  },
  iconTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing[3]
  },
  titleWrap: {
    flex: 1
  },
  optionalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  backBtn: {
    padding: tokens.spacing[1],
    marginRight: tokens.spacing[2]
  },
  closeBtn: {
    padding: tokens.spacing[1]
  },
  description: {
    lineHeight: 18,
    marginBottom: tokens.spacing[3]
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.spacing[1]
  },
  actionButtonPrimary: {
    minWidth: 140,
    height: 42,
    marginRight: tokens.spacing[3]
  },
  actionButtonSecondary: {
    paddingVertical: tokens.spacing[2],
    paddingHorizontal: tokens.spacing[3]
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing[2],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    marginBottom: tokens.spacing[3]
  },
  feedbackText: {
    marginLeft: tokens.spacing[2],
    flex: 1
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing[3]
  },
  inputContainer: {
    flex: 1,
    height: 48,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing[3]
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 8
  },
  verifyButton: {
    minWidth: 110,
    height: 48
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing[1]
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b33',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  }
});
