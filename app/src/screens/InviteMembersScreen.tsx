import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Tappable } from '../components/Tappable';
import { useAppNavigation } from '../navigation';

interface Invitee {
  id: string;
  email: string;
  status: 'Pending' | 'Invited';
}

/**
 * Screen 4: Invite Team Members Screen
 * Visual source of truth: 19-screen reference layout.
 * Features:
 * - Back arrow navigation
 * - Segmented toggle: [Email] and [Share Link]
 * - Email invitation field with "Send Invite" action
 * - Recent invitations list with semantic status badges:
 *   - sarah@company.com (Pending - amber)
 *   - mike@company.com (Invited - blue)
 *   - lisa@company.com (Invited - blue)
 * - Bottom action to continue to Dashboard
 */
export function InviteMembersScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useAppNavigation();

  const [activeTab, setActiveTab] = useState<'Email' | 'Share Link'>('Email');
  const [emailInput, setEmailInput] = useState('');
  const [invitees, setInvitees] = useState<Invitee[]>([
    { id: '1', email: 'sarah@company.com', status: 'Pending' },
    { id: '2', email: 'mike@company.com', status: 'Invited' },
    { id: '3', email: 'lisa@company.com', status: 'Invited' }
  ]);

  const handleSendInvite = (): void => {
    if (emailInput.trim()) {
      setInvitees((prev) => [
        { id: String(Date.now()), email: emailInput.trim(), status: 'Pending' },
        ...prev
      ]);
      setEmailInput('');
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
          accessibilityHint="Navigates back to the sign up screen"
          hitSlop={8}
          style={styles.backButton}
        >
          <View style={styles.arrowIconWrapper} importantForAccessibility="no">
            <View style={[styles.arrowShaft, { backgroundColor: colors['on-background-color'] }]} />
            <View style={[styles.arrowHeadUpper, { borderColor: colors['on-background-color'] }]} />
          </View>
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
          Invite Team Members
        </Text>
        <Text
          variant="base"
          color={colors['on-surface-variant-color']}
          style={styles.subtitle}
        >
          Add your team by email or share a link.
        </Text>
      </View>

      {/* Segmented Control: [Email] and [Share Link] */}
      <View
        style={[styles.segmentedWrapper, { backgroundColor: colors['surface-variant-color'] }]}
        accessibilityRole="tablist"
      >
        <Tappable
          onPress={() => setActiveTab('Email')}
          accessibilityRole="tab"
          accessibilityLabel="Invite by email"
          accessibilityState={{ selected: activeTab === 'Email' }}
          style={[
            styles.segmentBtn,
            activeTab === 'Email' && { backgroundColor: colors['surface-container-lowest-color'] }
          ]}
        >
          <Text
            weight={activeTab === 'Email' ? 'semibold' : 'regular'}
            variant="sm"
            color={activeTab === 'Email' ? colors['primary-color'] : colors['on-surface-variant-color']}
          >
            Email
          </Text>
        </Tappable>

        <Tappable
          onPress={() => setActiveTab('Share Link')}
          accessibilityRole="tab"
          accessibilityLabel="Invite by share link"
          accessibilityState={{ selected: activeTab === 'Share Link' }}
          style={[
            styles.segmentBtn,
            activeTab === 'Share Link' && { backgroundColor: colors['surface-container-lowest-color'] }
          ]}
        >
          <Text
            weight={activeTab === 'Share Link' ? 'semibold' : 'regular'}
            variant="sm"
            color={activeTab === 'Share Link' ? colors['primary-color'] : colors['on-surface-variant-color']}
          >
            Share Link
          </Text>
        </Tappable>
      </View>

      {/* Invite Input Card */}
      <Card style={styles.inputCard}>
        {activeTab === 'Email' ? (
          <>
            <Input
              label="Enter email address"
              value={emailInput}
              onChangeText={setEmailInput}
              accessibilityLabel="Email address to invite"
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="e.g. jane@company.com"
            />
            <Button
              title="Send Invite"
              variant="primary"
              accessibilityHint="Sends an invitation to the email address entered above"
              onPress={handleSendInvite}
              style={styles.sendButton}
            />
          </>
        ) : (
          <View style={styles.shareLinkContainer}>
            <Text weight="medium" variant="sm" color={colors['on-surface-color']}>
              Team Invite Link
            </Text>
            <View
              style={[
                styles.linkBox,
                {
                  backgroundColor: colors['surface-variant-color'],
                  borderColor: colors['outline-variant-color']
                }
              ]}
            >
              <Text
                variant="sm"
                color={colors['on-surface-variant-color']}
                numberOfLines={1}
                style={styles.linkText}
              >
                https://rota.app/join/t/team-main-floor-7x2
              </Text>
            </View>
            <Button
              title="Copy Link"
              variant="secondary"
              accessibilityLabel="Copy team invite link"
              onPress={() => {}}
              style={styles.sendButton}
            />
          </View>
        )}
      </Card>

      {/* Invitee Status List */}
      <View style={styles.listSection}>
        <Text
          weight="semibold"
          variant="lg"
          color={colors['on-background-color']}
          style={styles.listHeader}
          accessibilityRole="header"
        >
          Recent Invitations
        </Text>

        {invitees.map((item) => (
          <View
            key={item.id}
            accessible
            accessibilityLabel={`${item.email}, Status: ${item.status}`}
            style={[
              styles.inviteeRow,
              {
                backgroundColor: colors['surface-container-lowest-color'],
                borderColor: colors['outline-variant-color']
              }
            ]}
          >
            <View style={styles.emailContainer}>
              <View
                style={[styles.avatarDot, { backgroundColor: colors['primary-container-color'] }]}
                importantForAccessibility="no-hide-descendants"
              >
                <Text weight="semibold" variant="xs" color={colors['on-primary-container-color']}>
                  {item.email[0].toUpperCase()}
                </Text>
              </View>
              <Text variant="sm" weight="medium" color={colors['on-surface-color']}>
                {item.email}
              </Text>
            </View>
            <Badge status={item.status} />
          </View>
        ))}
      </View>

      {/* Bottom Actions to continue */}
      <View style={styles.bottomActions}>
        <Button
          title="Continue to Dashboard"
          variant="primary"
          onPress={() => navigation.goToDashboard()}
          style={styles.continueButton}
          accessibilityLabel="Continue to Dashboard"
          accessibilityHint="Navigates to the shift schedule dashboard"
        />

        <Button
          title="View Team & Roles"
          variant="outline"
          onPress={() => navigation.navigate(5)}
          style={styles.viewTeamButton}
          accessibilityLabel="View Team & Roles"
        />
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
    marginBottom: tokens.spacing[6]
  },
  subtitle: {
    marginTop: tokens.spacing[1.5]
  },
  segmentedWrapper: {
    flexDirection: 'row',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[1],
    marginBottom: tokens.spacing[4]
  },
  segmentBtn: {
    flex: 1,
    minHeight: tokens.accessibility.minTouchTarget,
    borderRadius: tokens.radius.md,
    justifyContent: 'center',
    alignItems: 'center'
  },
  inputCard: {
    gap: tokens.spacing[3]
  },
  shareLinkContainer: {
    gap: tokens.spacing[2]
  },
  linkBox: {
    paddingHorizontal: tokens.spacing[3.5],
    paddingVertical: tokens.spacing[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1
  },
  linkText: {
    fontFamily: tokens.typography.fontFamily.mono
  },
  sendButton: {
    marginTop: tokens.spacing[1]
  },
  listSection: {
    marginTop: tokens.spacing[6],
    gap: tokens.spacing[2.5]
  },
  listHeader: {
    marginBottom: tokens.spacing[1]
  },
  inviteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing[3.5],
    borderRadius: tokens.radius.lg,
    borderWidth: 1
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3]
  },
  avatarDot: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomActions: {
    marginTop: tokens.spacing[8],
    gap: tokens.spacing[3]
  },
  continueButton: {
    width: '100%'
  },
  viewTeamButton: {
    width: '100%'
  }
});
