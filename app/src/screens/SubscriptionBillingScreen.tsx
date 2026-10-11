import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useAppStore } from '../storage/store';

export function SubscriptionBillingScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  const features = [
    'Shift scheduling',
    'Swap requests',
    'Push notifications',
    'Offline access'
  ];

  const currentSeats = 5;
  const totalSeats = 10;
  const progressRatio = currentSeats / totalSeats;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { backgroundColor: colors['background-color'] }]}
    >
      <View style={styles.header}>
        <Text weight="bold" variant="3xl" color={colors['on-background-color']} accessibilityRole="header">
          Subscription
        </Text>
      </View>

      {/* Main Plan Card */}
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text weight="bold" variant="2xl" color={colors['on-surface-color']} accessibilityRole="header">
            Pro Plan
          </Text>
          <Badge label="Active" tone="emerald" />
        </View>

        <View style={styles.pricingSection}>
          <Text weight="extrabold" variant="3xl" color={colors['primary-color']}>
            $12 / seat / month
          </Text>
          <Text variant="sm" color={colors['on-surface-variant-color']} style={styles.billingSub}>
            Billed monthly · 5 seats
          </Text>
        </View>

        {/* Features Checklist */}
        <View style={styles.featuresList}>
          {features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View
                style={[styles.checkCircle, { backgroundColor: colors['secondary-container-color'] }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text weight="bold" variant="xs" color={colors['on-secondary-container-color']}>
                  ✓
                </Text>
              </View>
              <Text variant="sm" weight="medium" color={colors['on-surface-color']}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <Button
          title="Manage Plan"
          onPress={() => {}}
          style={styles.manageButton}
        />
      </Card>

      {/* Usage Indicator Card */}
      <Card style={styles.usageCard}>
        <View style={styles.usageHeader}>
          <Text weight="semibold" variant="base" color={colors['on-surface-color']}>
            Current Usage: 5 / 10 seats
          </Text>
          <Text variant="sm" weight="semibold" color={colors['primary-color']}>
            50%
          </Text>
        </View>

        {/* Progress Bar */}
        <View
          style={[styles.progressBarBackground, { backgroundColor: colors['surface-variant-color'] }]}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Seat usage"
          accessibilityValue={{ min: 0, max: totalSeats, now: currentSeats, text: `${currentSeats} of ${totalSeats} seats used` }}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressRatio * 100}%`,
                backgroundColor: colors['primary-color']
              }
            ]}
          />
        </View>
        <Text variant="xs" color={colors['on-surface-variant-color']}>
          5 available seats remain on your Pro tier.
        </Text>
      </Card>

      <Button
        title="Proceed to Shift Calendar"
        variant="secondary"
        onPress={() => setCurrentScreenId(7)} // Proceed to Flow 2 (Screen 7)
        style={styles.flowButton}
      />
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
  header: {
    marginBottom: tokens.spacing[6]
  },
  planCard: {
    padding: tokens.spacing[5],
    gap: tokens.spacing[4]
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pricingSection: {
    gap: tokens.spacing[1]
  },
  billingSub: {
    marginTop: tokens.spacing[0.5]
  },
  featuresList: {
    gap: tokens.spacing[2.5],
    marginVertical: tokens.spacing[2]
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3]
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  manageButton: {
    marginTop: tokens.spacing[2]
  },
  usageCard: {
    marginTop: tokens.spacing[4],
    gap: tokens.spacing[3]
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  progressBarBackground: {
    height: 8,
    borderRadius: tokens.radius.full,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: tokens.radius.full
  },
  flowButton: {
    marginTop: tokens.spacing[6]
  }
});
