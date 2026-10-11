import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Tappable } from '../components/Tappable';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAppStore } from '../storage/store';

export function ShiftCalendarScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { selectedCalendarDay, setSelectedCalendarDay, setCurrentScreenId } = useAppStore();
  const [viewMode, setViewMode] = useState<'Calendar' | 'List'>('Calendar');

  const daysOfWeek = [
    { dayNum: 11, label: 'Mon' },
    { dayNum: 12, label: 'Tue' },
    { dayNum: 13, label: 'Wed' },
    { dayNum: 14, label: 'Thu' },
    { dayNum: 15, label: 'Fri' },
    { dayNum: 16, label: 'Sat' },
    { dayNum: 17, label: 'Sun' }
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors['background-color'] }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header & Toggle */}
        <View style={styles.headerRow}>
          <Text weight="bold" variant="3xl" color={colors['on-background-color']} accessibilityRole="header">
            My Shifts
          </Text>

          <View
            style={[styles.toggleContainer, { backgroundColor: colors['surface-variant-color'] }]}
            accessibilityRole="tablist"
          >
            <Tappable
              onPress={() => setViewMode('Calendar')}
              accessibilityRole="tab"
              accessibilityLabel="Calendar view"
              accessibilityState={{ selected: viewMode === 'Calendar' }}
              style={[
                styles.toggleBtn,
                viewMode === 'Calendar' && { backgroundColor: colors['surface-container-lowest-color'] }
              ]}
            >
              <Text
                weight={viewMode === 'Calendar' ? 'semibold' : 'regular'}
                variant="xs"
                color={viewMode === 'Calendar' ? colors['primary-color'] : colors['on-surface-variant-color']}
              >
                Calendar
              </Text>
            </Tappable>

            <Tappable
              onPress={() => setViewMode('List')}
              accessibilityRole="tab"
              accessibilityLabel="List view"
              accessibilityState={{ selected: viewMode === 'List' }}
              style={[
                styles.toggleBtn,
                viewMode === 'List' && { backgroundColor: colors['surface-container-lowest-color'] }
              ]}
            >
              <Text
                weight={viewMode === 'List' ? 'semibold' : 'regular'}
                variant="xs"
                color={viewMode === 'List' ? colors['primary-color'] : colors['on-surface-variant-color']}
              >
                List
              </Text>
            </Tappable>
          </View>
        </View>

        {/* Month Header */}
        <View style={styles.monthHeaderRow}>
          <Tappable onPress={() => {}} accessibilityLabel="Previous month" style={styles.monthArrow}>
            <Text weight="bold" variant="xl" color={colors['primary-color']} importantForAccessibility="no">
              ‹
            </Text>
          </Tappable>
          <Text weight="bold" variant="base" color={colors['on-surface-color']} accessibilityRole="header">
            May 2026
          </Text>
          <Tappable onPress={() => {}} accessibilityLabel="Next month" style={styles.monthArrow}>
            <Text weight="bold" variant="xl" color={colors['primary-color']} importantForAccessibility="no">
              ›
            </Text>
          </Tappable>
        </View>

        {/* Horizontal Date Strip: scrolls so each day keeps a full 48dp target on narrow screens */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateStripScroll}
          contentContainerStyle={styles.dateStrip}
          accessibilityRole="tablist"
        >
          {daysOfWeek.map((item) => {
            const isSelected = item.dayNum === selectedCalendarDay;
            return (
              <Tappable
                key={item.dayNum}
                onPress={() => setSelectedCalendarDay(item.dayNum)}
                accessibilityRole="tab"
                accessibilityLabel={`${item.label} May ${item.dayNum}`}
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.dayChip,
                  isSelected && [styles.activeDayChip, { backgroundColor: colors['primary-color'] }]
                ]}
              >
                <Text
                  variant="xs"
                  weight={isSelected ? 'semibold' : 'regular'}
                  color={isSelected ? colors['on-primary-color'] : colors['on-surface-variant-color']}
                >
                  {item.label}
                </Text>
                <Text
                  variant="sm"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? colors['on-primary-color'] : colors['on-surface-color']}
                  style={styles.dayNum}
                >
                  {item.dayNum}
                </Text>
              </Tappable>
            );
          })}
        </ScrollView>

        {/* Day Group Header */}
        <View style={styles.dayGroupHeader}>
          <Text weight="semibold" variant="base" color={colors['on-surface-variant-color']} accessibilityRole="header">
            Tuesday, May 12
          </Text>
        </View>

        {/* Shift Card */}
        <Card variant="elevated" style={styles.shiftCard}>
          <View
            accessible
            accessibilityLabel="Shift 09:00 to 17:00, Waiter, Main Floor, assigned by Marcus Vance. Status: Confirmed"
            style={styles.shiftSummary}
          >
          <View style={styles.shiftRow}>
            <View style={[styles.timeBadge, { backgroundColor: colors['secondary-container-color'] }]}>
              <Text weight="bold" variant="sm" color={colors['on-secondary-container-color']}>
                09:00 - 17:00
              </Text>
            </View>
            <Badge label="Confirmed" tone="emerald" />
          </View>

          <View style={styles.shiftDetails}>
            <Text weight="bold" variant="lg" color={colors['on-surface-color']}>
              Waiter · Main Floor
            </Text>
            <Text variant="sm" color={colors['on-surface-variant-color']}>
              Assigned by Marcus Vance
            </Text>
          </View>
          </View>

          <Tappable
            onPress={() => setCurrentScreenId(9)} // Navigate to Request Shift Swap (Screen 9)
            accessibilityLabel="Request swap for this shift"
            style={[styles.swapRequestTouch, { borderColor: colors['outline-variant-color'] }]}
          >
            <Text weight="semibold" variant="sm" color={colors['primary-color']}>
              Request Swap
            </Text>
          </Tappable>
        </Card>
      </ScrollView>

      <BottomTabBar activeTab="home" />
    </View>
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
    paddingTop: tokens.spacing[12],
    paddingBottom: tokens.spacing[20]
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing[4]
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: tokens.radius.md,
    padding: tokens.spacing[0.5]
  },
  toggleBtn: {
    paddingHorizontal: tokens.spacing[3],
    borderRadius: tokens.radius.sm,
    alignItems: 'center'
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[3]
  },
  monthArrow: {
    alignItems: 'center'
  },
  dateStripScroll: {
    marginBottom: tokens.spacing[6]
  },
  dateStrip: {
    flexDirection: 'row',
    gap: tokens.accessibility.touchTargetGap
  },
  dayChip: {
    alignItems: 'center',
    paddingVertical: tokens.spacing[2],
    paddingHorizontal: tokens.spacing[2.5],
    borderRadius: tokens.radius.lg
  },
  activeDayChip: {
    elevation: 2
  },
  dayNum: {
    marginTop: tokens.spacing[1]
  },
  dayGroupHeader: {
    marginBottom: tokens.spacing[3]
  },
  shiftCard: {
    gap: tokens.spacing[3.5]
  },
  shiftSummary: {
    gap: tokens.spacing[3.5]
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  timeBadge: {
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[1.5],
    borderRadius: tokens.radius.md
  },
  shiftDetails: {
    gap: tokens.spacing[1]
  },
  swapRequestTouch: {
    marginTop: tokens.spacing[1],
    borderTopWidth: 1,
    alignItems: 'center'
  }
});
