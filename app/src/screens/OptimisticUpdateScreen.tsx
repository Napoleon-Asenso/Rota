import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Tappable } from '../components/Tappable';
import { useAppStore } from '../storage/store';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react-native';

export function OptimisticUpdateScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { backgroundColor: colors['background-color'] }]}
    >
      <Tappable
        onPress={() => setCurrentScreenId(7)}
        style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
        accessibilityRole="button"
        accessibilityLabel="Back to Schedule"
      >
        <ArrowLeft size={18} color={colors['primary-color']} />
        <Text weight="semibold" variant="sm" color={colors['primary-color']}>
          Back to Schedule
        </Text>
      </Tappable>

      <View style={styles.header}>
        <Text
          weight="bold"
          variant="3xl"
          color={colors['on-background-color']}
          accessibilityRole="header"
        >
          Swap Requests
        </Text>
      </View>

      {/* Tabs [Pending (1) | History] */}
      <View
        style={[styles.tabContainer, { backgroundColor: colors['surface-variant-color'] }]}
        accessibilityRole="tablist"
      >
        <Tappable
          onPress={() => setActiveTab('Pending')}
          style={[
            styles.tabBtn,
            activeTab === 'Pending' && { backgroundColor: colors['surface-container-lowest-color'] }
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Pending' }}
          accessibilityLabel="Pending, 1 request"
        >
          <Text
            weight={activeTab === 'Pending' ? 'bold' : 'medium'}
            variant="sm"
            color={activeTab === 'Pending' ? colors['primary-color'] : colors['on-surface-variant-color']}
          >
            Pending (1)
          </Text>
        </Tappable>

        <Tappable
          onPress={() => setActiveTab('History')}
          style={[
            styles.tabBtn,
            activeTab === 'History' && { backgroundColor: colors['surface-container-lowest-color'] }
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'History' }}
          accessibilityLabel="History, 0 requests"
        >
          <Text
            weight={activeTab === 'History' ? 'bold' : 'medium'}
            variant="sm"
            color={activeTab === 'History' ? colors['primary-color'] : colors['on-surface-variant-color']}
          >
            History
          </Text>
        </Tappable>
      </View>

      {/* Optimistic Card with Badge "Requesting swap..." (blue) */}
      <Card
        style={styles.swapCard}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel="Swap request for Tuesday, May 12, 09:00 to 17:00. Status: Requesting swap. Target Peer: Marcus Vance, Shift: Waiter, Main Floor. Request is currently in flight."
      >
        <View style={styles.cardHeader}>
          <Text weight="bold" variant="base" color={colors['on-surface-color']}>
            Tuesday, May 12 · 09:00 - 17:00
          </Text>
          <Badge label="Requesting swap..." tone="blue" />
        </View>

        <View style={styles.coworkerSection}>
          <Text variant="sm" color={colors['on-surface-variant-color']}>
            Target Peer: <Text weight="semibold" color={colors['on-surface-color']}>Marcus Vance</Text>
          </Text>
          <Text variant="xs" color={colors['outline-color']}>
            Shift: Waiter · Main Floor
          </Text>
        </View>

        {/* Action Buttons: Disabled Action Button & Cancel Button */}
        <View style={styles.buttonRow}>
          <Button
            title="In Flight..."
            disabled
            onPress={() => {}}
            style={styles.disabledBtn}
            accessibilityLabel="Shift swap mutation in flight, please wait"
          />
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setCurrentScreenId(7)}
            style={styles.cancelBtn}
            accessibilityLabel="Cancel swap request and return to schedule"
          />
        </View>
      </Card>

      <Tappable
        onPress={() => setCurrentScreenId(19)}
        style={[styles.nextLink, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
        accessibilityRole="button"
        accessibilityLabel="Go to Screen 19: Swap Review and Manager Approval"
      >
        <Text variant="sm" weight="semibold" color={colors['primary-color']}>
          Screen 19: Swap Review / Manager Approval
        </Text>
        <ArrowRight size={16} color={colors['primary-color']} />
      </Tappable>
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
    paddingTop: tokens.spacing[12],
    paddingBottom: tokens.spacing[8]
  },
  backButton: {
    marginBottom: tokens.spacing[2],
    minHeight: tokens.accessibility.minTouchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start'
  },
  header: {
    marginBottom: tokens.spacing[4],
    maxWidth: tokens.layout.heroMaxWidth,
    width: '100%'
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[1],
    marginBottom: tokens.spacing[4],
    gap: tokens.spacing[1]
  },
  tabBtn: {
    flex: 1,
    minHeight: tokens.accessibility.minTouchTarget,
    borderRadius: tokens.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: tokens.spacing[2]
  },
  swapCard: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[3]
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  coworkerSection: {
    gap: tokens.spacing[1]
  },
  buttonRow: {
    flexDirection: 'row',
    gap: tokens.spacing[3],
    marginTop: tokens.spacing[2]
  },
  disabledBtn: {
    flex: 1
  },
  cancelBtn: {
    flex: 1
  },
  nextLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing[6],
    minHeight: tokens.accessibility.minTouchTarget,
    paddingVertical: tokens.spacing[2]
  }
});
