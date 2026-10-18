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
import { authApi } from '../services/api';
import { ArrowLeft, Shield, Bell, Sun, RefreshCw, CloudOff, HelpCircle, LogOut } from 'lucide-react-native';

/**
 * Clean Geometric Vector Icons for Settings Menu Rows
 */
function MenuIcon({ name, color }: { name: string; color: string }): React.JSX.Element {
  if (name === 'account') {
    return <Shield size={20} color={color} />;
  }
  if (name === 'notifications') {
    return <Bell size={20} color={color} />;
  }
  if (name === 'appearance') {
    return <Sun size={20} color={color} />;
  }
  if (name === 'sync') {
    return <RefreshCw size={20} color={color} />;
  }
  if (name === 'offline') {
    return <CloudOff size={20} color={color} />;
  }
  if (name === 'help') {
    return <HelpCircle size={20} color={color} />;
  }
  return <LogOut size={20} color="#EF4444" />;
}

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

  const handleLogout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setCurrentScreenId(1); // Return to Welcome Screen
    }
  };

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
            <ArrowLeft size={24} color={colors['on-background-color']} />
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
          onPress={handleLogout}
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
