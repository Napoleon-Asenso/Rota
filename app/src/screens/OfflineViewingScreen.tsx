import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useAppStore } from '../storage/store';
import { useShiftStore } from '../stores/shiftStore';
import { ArrowLeft, CloudOff } from 'lucide-react-native';



interface CachedShift {
  id: string;
  dayLabel: string;
  timeRange: string;
  roleAndVenue: string;
}

const CACHED_SHIFTS: CachedShift[] = [
  {
    id: '1',
    dayLabel: 'Tue, May 27',
    timeRange: '9:00 AM - 5:00 PM',
    roleAndVenue: 'Waiter · Main Floor'
  },
  {
    id: '2',
    dayLabel: 'Wed, May 28',
    timeRange: '5:00 PM - 1:00 AM',
    roleAndVenue: 'Waiter · Main Floor'
  },
  {
    id: '3',
    dayLabel: 'Thu, May 29',
    timeRange: '9:00 AM - 5:00 PM',
    roleAndVenue: 'Waiter · Main Floor'
  }
];

/**
 * Screen 12: Offline Viewing Screen
 * Features:
 * - Back arrow header navigation
 * - Header title "Upcoming Shifts" with "Available Offline" status pill (#059669 on #ECFDF5)
 * - Reads upcoming shifts dynamically from persistent useShiftStore
 * - Persistent floating bottom banner in surface-container-high-color:
 *   - Cloud-slash offline icon in primary-color
 *   - "You're offline. Showing cached data"
 */
export function OfflineViewingScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);
  const upcomingShifts = useShiftStore((s) => s.upcomingShifts);
  const lastUpdated = useShiftStore((s) => s.lastUpdated);

  return (
    <View style={[styles.root, { backgroundColor: colors['background-color'] }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Back Arrow */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => setCurrentScreenId(11)} // Return to Settings (Screen 11)
            accessibilityRole="button"
            accessibilityLabel="Back to Settings"
            hitSlop={8}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors['on-background-color']} />
          </Pressable>
        </View>

        {/* Title and Status Pill */}
        <View style={styles.headerRow}>
          <Text
            weight="bold"
            variant="3xl"
            color={colors['on-background-color']}
            accessibilityRole="header"
          >
            Upcoming Shifts
          </Text>
          <Badge label="Available Offline" tone="emerald" />
        </View>

        {/* Cached Shift Cards List */}
        <View style={styles.shiftsList}>
          {upcomingShifts.map((shift) => (
            <Card
              key={shift.id}
              variant="elevated"
              style={styles.shiftCard}
              accessible
              accessibilityRole="summary"
              accessibilityLabel={`Shift on ${shift.dayLabel}: ${shift.timeRange}, ${shift.roleAndVenue}. Available offline.`}
            >
              <View style={styles.shiftHeaderRow}>
                <Text weight="bold" variant="base" color={colors['on-surface-color']}>
                  {shift.dayLabel}
                </Text>
                <View
                  style={[
                    styles.timePill,
                    { backgroundColor: colors['secondary-container-color'] }
                  ]}
                >
                  <Text
                    weight="semibold"
                    variant="xs"
                    color={colors['on-secondary-container-color']}
                  >
                    {shift.timeRange}
                  </Text>
                </View>
              </View>

              <Text
                weight="medium"
                variant="sm"
                color={colors['primary-color']}
              >
                {shift.roleAndVenue}
              </Text>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Persistent Bottom Floating Offline Banner */}
      <View
        style={[
          styles.offlineBanner,
          {
            backgroundColor: colors['surface-container-high-color'] || colors['surface-variant-color'],
            borderColor: colors['outline-variant-color']
          }
        ]}
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel="Offline banner: You're offline. Showing cached data"
      >
        <CloudOff size={22} color={colors['primary-color']} />
        <Text
          weight="medium"
          variant="sm"
          color={colors['on-surface-color']}
          style={styles.bannerText}
        >
          You're offline. Showing cached data
        </Text>
      </View>
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
    paddingBottom: tokens.spacing[28] // Room for persistent floating banner
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing[2]
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
  arrowHead: {
    position: 'absolute',
    left: 4,
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    transform: [{ rotate: '-45deg' }]
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing[6],
    gap: tokens.spacing[2],
    maxWidth: tokens.layout.heroTextMaxWidth,
    width: '100%'
  },
  shiftsList: {
    gap: tokens.spacing[3]
  },
  shiftCard: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[2]
  },
  shiftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  timePill: {
    paddingHorizontal: tokens.spacing[2.5],
    paddingVertical: tokens.spacing[1],
    borderRadius: tokens.radius.md
  },
  offlineBanner: {
    position: 'absolute',
    bottom: tokens.spacing[6],
    left: tokens.spacing[4],
    right: tokens.spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2.5],
    paddingVertical: tokens.spacing[3.5],
    paddingHorizontal: tokens.spacing[4],
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6
  },
  bannerText: {
    letterSpacing: -0.1
  }
});

export default OfflineViewingScreen;
