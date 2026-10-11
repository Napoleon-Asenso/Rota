import React, { useState } from 'react';
import { View, StyleSheet, Switch, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PushNotificationModal } from '../components/PushNotificationModal';
import { useAppStore } from '../storage/store';

/**
 * Geometric Vector Bell Hero Icon
 */
function BellHeroIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <View style={bellStyles.container} accessibilityElementsHidden importantForAccessibility="no">
      {/* Top hanger loop */}
      <View style={[bellStyles.hanger, { borderColor: color }]} />
      {/* Bell main dome */}
      <View style={[bellStyles.dome, { backgroundColor: color }]} />
      {/* Bell bottom lip */}
      <View style={[bellStyles.lip, { backgroundColor: color }]} />
      {/* Clapper */}
      <View style={[bellStyles.clapper, { backgroundColor: color }]} />
    </View>
  );
}

const bellStyles = StyleSheet.create({
  container: {
    width: 36,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  hanger: {
    width: 8,
    height: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 2,
    borderBottomWidth: 0,
    marginBottom: -1
  },
  dome: {
    width: 24,
    height: 22,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4
  },
  lip: {
    width: 32,
    height: 4,
    borderRadius: 2,
    marginTop: -1
  },
  clapper: {
    width: 8,
    height: 5,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: 1
  }
});

/**
 * Screen 10: Push Notification Settings Screen
 * Features:
 * - Back arrow header navigation (44pt touch target)
 * - Hero bell illustration in circular container
 * - Title "Notifications" & Subtitle
 * - Switch controls (active state in primary-color):
 *   1. Shift changes (ON)
 *   2. Swap requests (ON)
 *   3. Approvals (ON)
 *   4. Team messages (OFF)
 * - Push notification preview trigger button
 */
export function PushNotificationSettingsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { notificationToggles, setNotificationToggle, setCurrentScreenId } = useAppStore();
  const [showPushBanner, setShowPushBanner] = useState<boolean>(false);

  return (
    <View style={[styles.root, { backgroundColor: colors['background-color'] }]}>
      {/* Interactive Push Notification Banner Simulation */}
      <PushNotificationModal
        visible={showPushBanner}
        onDismiss={() => setShowPushBanner(false)}
        title="Shift approved"
        body="Your swap request for May 29 has been approved."
        targetScreenId={7}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar with Back Arrow */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => setCurrentScreenId(11)} // Navigate to Settings (Screen 11)
            accessibilityRole="button"
            accessibilityLabel="Back to Settings"
            hitSlop={8}
            style={styles.backButton}
          >
            <View style={styles.arrowIconWrapper} importantForAccessibility="no">
              <View style={[styles.arrowShaft, { backgroundColor: colors['on-background-color'] }]} />
              <View style={[styles.arrowHead, { borderColor: colors['on-background-color'] }]} />
            </View>
          </Pressable>
          <Text weight="bold" variant="lg" color={colors['on-background-color']}>
            Notifications
          </Text>
          <View style={styles.topBarSpacer} />
        </View>

        {/* Hero Icon Area */}
        <View
          style={styles.heroContainer}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            style={[
              styles.heroCircle,
              { backgroundColor: colors['primary-container-color'] }
            ]}
          >
            <BellHeroIcon color={colors['primary-color']} />
          </View>
        </View>

        {/* Header Title & Subtitle */}
        <View style={styles.header}>
          <Text
            weight="bold"
            variant="3xl"
            color={colors['on-background-color']}
            style={styles.title}
            accessibilityRole="header"
          >
            Notifications
          </Text>
          <Text
            variant="base"
            color={colors['on-surface-variant-color']}
            style={styles.subtitle}
          >
            Get notified about shift changes, swap requests and approvals.
          </Text>
        </View>

        {/* Toggle List Card */}
        <Card style={styles.card}>
          {/* 1. Shift changes (Default: ON) */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text weight="semibold" variant="base" color={colors['on-surface-color']}>
                Shift changes
              </Text>
              <Text variant="xs" color={colors['on-surface-variant-color']}>
                Alerts when shifts are added, edited, or cancelled
              </Text>
            </View>
            <Switch
              value={notificationToggles.shiftChanges}
              onValueChange={(val) => setNotificationToggle('shiftChanges', val)}
              accessibilityLabel="Shift changes notifications"
              accessibilityHint="Toggles alerts when shifts are added, edited, or cancelled"
              thumbColor={notificationToggles.shiftChanges ? colors['primary-color'] : colors['surface-variant-color']}
              trackColor={{
                true: colors['primary-container-color'],
                false: colors['surface-variant-color']
              }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors['outline-variant-color'] }]} />

          {/* 2. Swap requests (Default: ON) */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text weight="semibold" variant="base" color={colors['on-surface-color']}>
                Swap requests
              </Text>
              <Text variant="xs" color={colors['on-surface-variant-color']}>
                Incoming swap invitations from team members
              </Text>
            </View>
            <Switch
              value={notificationToggles.swapRequests}
              onValueChange={(val) => setNotificationToggle('swapRequests', val)}
              accessibilityLabel="Swap requests notifications"
              accessibilityHint="Toggles incoming swap invitations from team members"
              thumbColor={notificationToggles.swapRequests ? colors['primary-color'] : colors['surface-variant-color']}
              trackColor={{
                true: colors['primary-container-color'],
                false: colors['surface-variant-color']
              }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors['outline-variant-color'] }]} />

          {/* 3. Approvals (Default: ON) */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text weight="semibold" variant="base" color={colors['on-surface-color']}>
                Approvals
              </Text>
              <Text variant="xs" color={colors['on-surface-variant-color']}>
                Manager reviews and final shift reassignments
              </Text>
            </View>
            <Switch
              value={notificationToggles.approvals}
              onValueChange={(val) => setNotificationToggle('approvals', val)}
              accessibilityLabel="Approvals notifications"
              accessibilityHint="Toggles manager reviews and final shift reassignments"
              thumbColor={notificationToggles.approvals ? colors['primary-color'] : colors['surface-variant-color']}
              trackColor={{
                true: colors['primary-container-color'],
                false: colors['surface-variant-color']
              }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors['outline-variant-color'] }]} />

          {/* 4. Team messages (Default: OFF) */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text weight="semibold" variant="base" color={colors['on-surface-color']}>
                Team messages
              </Text>
              <Text variant="xs" color={colors['on-surface-variant-color']}>
                General broadcast announcements
              </Text>
            </View>
            <Switch
              value={notificationToggles.teamMessages}
              onValueChange={(val) => setNotificationToggle('teamMessages', val)}
              accessibilityLabel="Team messages notifications"
              accessibilityHint="Toggles general broadcast announcements"
              thumbColor={notificationToggles.teamMessages ? colors['primary-color'] : colors['surface-variant-color']}
              trackColor={{
                true: colors['primary-container-color'],
                false: colors['surface-variant-color']
              }}
            />
          </View>
        </Card>

        {/* Preview Simulation Action */}
        <View style={styles.previewContainer}>
          <Button
            title="Preview Push Notification (Screen 19)"
            variant="outline"
            onPress={() => setShowPushBanner(true)}
            accessibilityLabel="Preview push notification simulation banner"
            accessibilityHint="Displays an interactive OS-style notification banner"
            style={styles.previewBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[4],
    paddingBottom: tokens.spacing[12]
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing[4]
  },
  backButton: {
    width: tokens.accessibility.minTouchTarget,
    height: tokens.accessibility.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  topBarSpacer: {
    width: tokens.accessibility.minTouchTarget
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
  arrowHead: {
    position: 'absolute',
    left: 4,
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    transform: [{ rotate: '-45deg' }]
  },
  heroContainer: {
    alignItems: 'center',
    marginTop: tokens.spacing[2],
    marginBottom: tokens.spacing[4]
  },
  heroCircle: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    alignItems: 'center',
    marginBottom: tokens.spacing[6]
  },
  title: {
    textAlign: 'center'
  },
  subtitle: {
    textAlign: 'center',
    marginTop: tokens.spacing[2],
    paddingHorizontal: tokens.spacing[4],
    lineHeight: 22
  },
  card: {
    padding: tokens.spacing[4]
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing[3]
  },
  toggleText: {
    flex: 1,
    paddingRight: tokens.spacing[4],
    gap: tokens.spacing[0.5]
  },
  divider: {
    height: 1
  },
  previewContainer: {
    marginTop: tokens.spacing[6],
    alignItems: 'center'
  },
  previewBtn: {
    width: '100%'
  }
});

export default PushNotificationSettingsScreen;
