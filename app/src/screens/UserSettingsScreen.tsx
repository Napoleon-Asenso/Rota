import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { BottomTabBar } from '../components/BottomTabBar';
import { PushNotificationModal } from '../components/PushNotificationModal';
import { useAppStore } from '../storage/store';

/**
 * Clean Geometric Vector Icons for Settings Menu Rows
 */
function MenuIcon({ name, color }: { name: string; color: string }): React.JSX.Element {
  if (name === 'account') {
    // Shield / Account Icon
    return (
      <View style={iconStyles.box}>
        <View style={[iconStyles.shieldTop, { backgroundColor: color }]} />
        <View style={[iconStyles.shieldBottom, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === 'notifications') {
    // Bell Icon
    return (
      <View style={iconStyles.box}>
        <View style={[iconStyles.bellDome, { backgroundColor: color }]} />
        <View style={[iconStyles.bellLip, { backgroundColor: color }]} />
        <View style={[iconStyles.bellDot, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === 'appearance') {
    // Sun / Moon Icon
    return (
      <View style={iconStyles.box}>
        <View style={[iconStyles.sunCenter, { borderColor: color }]}>
          <View style={[iconStyles.sunDot, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  if (name === 'sync') {
    // Sync Circle Arrows
    return (
      <View style={iconStyles.box}>
        <View style={[iconStyles.syncRing, { borderColor: color }]} />
      </View>
    );
  }

  if (name === 'offline') {
    // Cloud Icon
    return (
      <View style={iconStyles.box}>
        <View style={[iconStyles.cloudPuff, { backgroundColor: color }]} />
        <View style={[iconStyles.cloudBase, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === 'help') {
    // Question / Help Mark
    return (
      <View style={iconStyles.box}>
        <View style={[iconStyles.helpCircle, { borderColor: color }]}>
          <Text variant="xs" weight="bold" color={color} style={iconStyles.helpText}>
            ?
          </Text>
        </View>
      </View>
    );
  }

  // Logout icon
  return (
    <View style={iconStyles.box}>
      <View style={[iconStyles.logoutFrame, { borderColor: '#EF4444' }]}>
        <View style={[iconStyles.logoutArrow, { backgroundColor: '#EF4444' }]} />
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  box: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  shieldTop: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7
  },
  shieldBottom: {
    width: 14,
    height: 9,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7
  },
  bellDome: {
    width: 14,
    height: 10,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7
  },
  bellLip: {
    width: 18,
    height: 2.5,
    borderRadius: 1.25,
    marginTop: 0.5
  },
  bellDot: {
    width: 4,
    height: 3,
    borderRadius: 1.5,
    marginTop: 0.5
  },
  sunCenter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sunDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  syncRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderStyle: 'dashed'
  },
  cloudPuff: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignSelf: 'center',
    marginBottom: -4
  },
  cloudBase: {
    width: 20,
    height: 8,
    borderRadius: 4
  },
  helpCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  helpText: {
    lineHeight: 14
  },
  logoutFrame: {
    width: 16,
    height: 16,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  logoutArrow: {
    width: 10,
    height: 2,
    marginRight: -4
  }
});

/**
 * Screen 11: User Settings Screen
 * Features:
 * - Back arrow header navigation
 * - Profile header: EO avatar, Emeka Okafor, Waiter · Main Floor
 * - Settings menu list with icons, badges, and right chevrons
 * - Destructive action: "Log Out" (returns to Screen 1: Welcome Splash)
 * - Persistent Bottom Tab Bar with "More" active
 */
export function UserSettingsScreen(): React.JSX.Element {
  const { colors, toggleTheme, mode } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);
  const [showPushBanner, setShowPushBanner] = useState<boolean>(false);

  return (
    <View style={[styles.root, { backgroundColor: colors['background-color'] }]}>
      {/* Push Notification Simulation Modal */}
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
        {/* Top Header Row with Back Arrow */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => setCurrentScreenId(7)} // Return to Calendar / Home (Screen 7)
            accessibilityRole="button"
            accessibilityLabel="Back to Schedule"
            hitSlop={8}
            style={styles.backButton}
          >
            <View style={styles.arrowIconWrapper} importantForAccessibility="no">
              <View style={[styles.arrowShaft, { backgroundColor: colors['on-background-color'] }]} />
              <View style={[styles.arrowHead, { borderColor: colors['on-background-color'] }]} />
            </View>
          </Pressable>
          <Text weight="bold" variant="lg" color={colors['on-background-color']}>
            Settings
          </Text>
          <View style={styles.topBarSpacer} />
        </View>

        {/* Profile Header Card */}
        <Card
          style={styles.profileCard}
          accessible
          accessibilityRole="header"
          accessibilityLabel="Profile: Emeka Okafor, Waiter, Main Floor"
        >
          <View style={styles.profileRow}>
            <View
              style={[styles.avatar, { backgroundColor: colors['primary-container-color'] }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text weight="bold" variant="xl" color={colors['on-primary-container-color']}>
                EO
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text weight="bold" variant="xl" color={colors['on-surface-color']}>
                Emeka Okafor
              </Text>
              <Text variant="sm" weight="medium" color={colors['primary-color']}>
                Waiter · Main Floor
              </Text>
            </View>
          </View>
        </Card>

        {/* Settings Menu List */}
        <Card style={styles.menuCard}>
          {/* 1. Account & Security */}
          <Pressable
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="Account & Security"
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <MenuIcon name="account" color={colors['primary-color']} />
              <Text weight="medium" variant="base" color={colors['on-surface-color']}>
                Account & Security
              </Text>
            </View>
            <Text variant="base" color={colors['outline-color']} importantForAccessibility="no">
              ›
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors['outline-variant-color'] }]} />

          {/* 2. Notifications (Screen 10) */}
          <Pressable
            onPress={() => setCurrentScreenId(10)}
            accessibilityRole="button"
            accessibilityLabel="Notifications settings"
            accessibilityHint="Navigates to push notification settings"
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <MenuIcon name="notifications" color={colors['primary-color']} />
              <Text weight="medium" variant="base" color={colors['on-surface-color']}>
                Notifications
              </Text>
            </View>
            <Text variant="base" color={colors['outline-color']} importantForAccessibility="no">
              ›
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors['outline-variant-color'] }]} />

          {/* 3. Appearance */}
          <Pressable
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={`Appearance, currently ${mode === 'dark' ? 'Dark' : 'Light'} mode`}
            accessibilityHint="Toggles between light and dark color schemes"
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <MenuIcon name="appearance" color={colors['primary-color']} />
              <Text weight="medium" variant="base" color={colors['on-surface-color']}>
                Appearance ({mode === 'dark' ? 'Dark' : 'Light'})
              </Text>
            </View>
            <Text variant="base" color={colors['outline-color']} importantForAccessibility="no">
              ›
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors['outline-variant-color'] }]} />

          {/* 4. Sync Across Devices */}
          <Pressable
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="Sync Across Devices, On"
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <MenuIcon name="sync" color={colors['primary-color']} />
              <Text weight="medium" variant="base" color={colors['on-surface-color']}>
                Sync Across Devices
              </Text>
            </View>
            <View style={styles.menuRightBadge}>
              <Badge label="On" tone="blue" />
              <Text variant="base" color={colors['outline-color']} importantForAccessibility="no">
                ›
              </Text>
            </View>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors['outline-variant-color'] }]} />

          {/* 5. Offline Access (Screen 12) */}
          <Pressable
            onPress={() => setCurrentScreenId(12)}
            accessibilityRole="button"
            accessibilityLabel="Offline Access, Upcoming shifts only"
            accessibilityHint="Navigates to cached offline shift schedule"
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <MenuIcon name="offline" color={colors['primary-color']} />
              <View>
                <Text weight="medium" variant="base" color={colors['on-surface-color']}>
                  Offline Access
                </Text>
                <Text variant="xs" color={colors['on-surface-variant-color']}>
                  Upcoming shifts only
                </Text>
              </View>
            </View>
            <Text variant="base" color={colors['outline-color']} importantForAccessibility="no">
              ›
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors['outline-variant-color'] }]} />

          {/* 6. Help & Support */}
          <Pressable
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="Help & Support"
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <MenuIcon name="help" color={colors['primary-color']} />
              <Text weight="medium" variant="base" color={colors['on-surface-color']}>
                Help & Support
              </Text>
            </View>
            <Text variant="base" color={colors['outline-color']} importantForAccessibility="no">
              ›
            </Text>
          </Pressable>
        </Card>

        {/* Destructive Action: Log Out */}
        <Pressable
          onPress={() => setCurrentScreenId(1)} // Return to Welcome Screen
          accessibilityRole="button"
          accessibilityLabel="Log Out"
          accessibilityHint="Logs out of your Rota account and returns to splash screen"
          style={[
            styles.logoutCard,
            {
              backgroundColor: colors['surface-container-lowest-color'],
              borderColor: colors['outline-variant-color']
            }
          ]}
        >
          <View style={styles.menuLeft}>
            <MenuIcon name="logout" color="#EF4444" />
            <Text weight="bold" variant="base" color="#EF4444">
              Log Out
            </Text>
          </View>
          <Text variant="base" color="#EF4444" importantForAccessibility="no">
            ›
          </Text>
        </Pressable>

        {/* Simulation Banner Trigger Preview */}
        <Pressable
          onPress={() => setShowPushBanner(true)}
          accessibilityRole="button"
          accessibilityLabel="Preview OS notification banner"
          style={styles.previewLink}
        >
          <Text variant="xs" weight="medium" color={colors['outline-color']}>
            Preview OS Notification Banner (Screen 19)
          </Text>
        </Pressable>
      </ScrollView>

      {/* Persistent Bottom Tab Bar with "More" active */}
      <BottomTabBar activeTab="more" />
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
    paddingBottom: tokens.spacing[24]
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
  profileCard: {
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4]
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3.5]
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileInfo: {
    gap: tokens.spacing[0.5]
  },
  menuCard: {
    paddingVertical: tokens.spacing[1],
    paddingHorizontal: tokens.spacing[4]
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing[3.5],
    minHeight: tokens.accessibility.minTouchTarget
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3]
  },
  menuRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2]
  },
  divider: {
    height: 1
  },
  logoutCard: {
    marginTop: tokens.spacing[4],
    paddingVertical: tokens.spacing[3.5],
    paddingHorizontal: tokens.spacing[4],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: tokens.accessibility.minTouchTarget
  },
  previewLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing[6],
    paddingVertical: tokens.spacing[2]
  }
});

export default UserSettingsScreen;
