import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { PushNotificationModal } from '../components/PushNotificationModal';
import { useAppStore } from '../storage/store';
import { ArrowLeft, ArrowRight, ArrowDownUp, Check, X, Clock } from 'lucide-react-native';

/**
 * Screen 19: Swap Review & Approval Screen
 * Features:
 * - Review of shift swap between Initiator and Target Peer
 * - Action buttons: "Approve Swap" and "Decline"
 * - Interactive push notification banner simulation (Screen 19 specification):
 *   - "Shift approved" / "Your swap request for May 29 has been approved."
 *   - Deep-links directly to Shift Calendar (Screen 7)
 */
export function SwapDetailReviewScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);
  const [showPushBanner, setShowPushBanner] = useState<boolean>(false);

  const handleApproveSwap = (): void => {
    // Triggers the OS-style push notification banner simulation
    setShowPushBanner(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors['background-color'] }]}>
      {/* Interactive OS Push Notification Banner (Screen 19) */}
      <PushNotificationModal
        visible={showPushBanner}
        onDismiss={() => setShowPushBanner(false)}
        title="Shift approved"
        body="Your swap request for May 29 has been approved."
        targetScreenId={7} // Shift Calendar
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Back Arrow */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => setCurrentScreenId(8)} // Return to Activity Feed (Screen 8)
            accessibilityRole="button"
            accessibilityLabel="Back to Activity Feed"
            hitSlop={8}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors['on-background-color']} />
          </Pressable>
          <Text weight="bold" variant="lg" color={colors['on-background-color']}>
            Swap Request
          </Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.header}>
          <Text
            weight="bold"
            variant="3xl"
            color={colors['on-background-color']}
            accessibilityRole="header"
          >
            Review Shift Swap
          </Text>
          <Badge label="Awaiting approval" tone="amber" />
        </View>

        {/* Staff 1 Card: Initiator */}
        <Text
          weight="semibold"
          variant="sm"
          color={colors['on-surface-variant-color']}
          style={styles.sectionLabel}
          accessibilityRole="header"
        >
          Initiator (Giving up shift)
        </Text>
        <Card
          variant="elevated"
          style={styles.card}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel="Initiator giving up shift: Emeka Okafor, Waiter, Main Floor. Shift on Tuesday, May 12, 09:00 to 17:00."
        >
          <View style={styles.personRow}>
            <View
              style={[styles.avatar, { backgroundColor: colors['primary-container-color'] }]}
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
            >
              <Text weight="bold" color={colors['on-primary-container-color']}>
                EO
              </Text>
            </View>
            <View>
              <Text weight="bold" variant="base" color={colors['on-surface-color']}>
                Emeka Okafor
              </Text>
              <Text variant="sm" color={colors['on-surface-variant-color']}>
                Waiter · Main Floor
              </Text>
            </View>
          </View>
          <Text
            weight="medium"
            variant="sm"
            color={colors['primary-color']}
            style={styles.shiftTime}
          >
            Tuesday, May 12 · 09:00 - 17:00
          </Text>
        </Card>

        {/* Swap Direction Indicator */}
        <View style={{ alignItems: 'center', marginVertical: tokens.spacing[2] }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors['surface-variant-color'], alignItems: 'center', justifyContent: 'center' }}>
            <ArrowDownUp size={18} color={colors['primary-color']} />
          </View>
        </View>

        {/* Staff 2 Card: Target Peer */}
        <Text
          weight="semibold"
          variant="sm"
          color={colors['on-surface-variant-color']}
          style={styles.sectionLabel}
          accessibilityRole="header"
        >
          Target Peer (Taking shift)
        </Text>
        <Card
          variant="elevated"
          style={styles.card}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel="Target peer taking shift: Marcus Vance, Manager, Main Floor. Status: Accepted by peer."
        >
          <View style={styles.personRow}>
            <View
              style={[styles.avatar, { backgroundColor: colors['secondary-container-color'] }]}
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
            >
              <Text weight="bold" color={colors['on-secondary-container-color']}>
                MV
              </Text>
            </View>
            <View>
              <Text weight="bold" variant="base" color={colors['on-surface-color']}>
                Marcus Vance
              </Text>
              <Text variant="sm" color={colors['on-surface-variant-color']}>
                Manager · Main Floor
              </Text>
            </View>
          </View>
          <Text
            weight="medium"
            variant="sm"
            color={colors['primary-color']}
            style={styles.shiftTime}
          >
            Status: Accepted by peer
          </Text>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title="Approve Swap"
            variant="primary"
            onPress={handleApproveSwap}
            style={styles.approveBtn}
            accessibilityLabel="Approve shift swap"
            accessibilityHint="Approves swap and triggers OS push notification simulation"
          />
          <Button
            title="Decline"
            variant="outline"
            onPress={() => setCurrentScreenId(8)}
            style={styles.declineBtn}
            accessibilityLabel="Decline shift swap"
            accessibilityHint="Declines swap and returns to Activity Feed"
          />
        </View>

        {/* Preview Trigger Link */}
        <Pressable
          onPress={() => setShowPushBanner(true)}
          accessibilityRole="button"
          accessibilityLabel="Preview OS notification banner"
          style={[styles.previewTrigger, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
        >
          <Text variant="xs" weight="medium" color={colors['primary-color']}>
            Preview OS Push Banner (Shift Approved)
          </Text>
          <ArrowRight size={14} color={colors['primary-color']} />
        </Pressable>
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
    marginBottom: tokens.spacing[3]
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
  header: {
    marginBottom: tokens.spacing[4],
    gap: tokens.spacing[2],
    alignItems: 'flex-start',
    maxWidth: tokens.layout.heroMaxWidth,
    width: '100%'
  },
  sectionLabel: {
    marginBottom: tokens.spacing[1.5],
    marginTop: tokens.spacing[3]
  },
  card: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[2]
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3]
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  shiftTime: {
    marginTop: tokens.spacing[1]
  },
  buttonRow: {
    marginTop: tokens.spacing[6],
    gap: tokens.spacing[3]
  },
  approveBtn: {
    width: '100%'
  },
  declineBtn: {
    width: '100%'
  },
  previewTrigger: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing[6],
    paddingVertical: tokens.spacing[2]
  }
});

export default SwapDetailReviewScreen;
