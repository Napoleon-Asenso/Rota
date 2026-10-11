import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Tappable } from '../components/Tappable';
import { useAppStore } from '../storage/store';

export function RequestSwapScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  const [message, setMessage] = useState('');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { backgroundColor: colors['background-color'] }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Tappable
          onPress={() => setCurrentScreenId(7)}
          accessibilityLabel="Back to schedule"
          style={styles.backButton}
        >
          <Text weight="semibold" variant="base" color={colors['primary-color']}>
            ← Back
          </Text>
        </Tappable>
        <Text weight="bold" variant="3xl" color={colors['on-background-color']} style={styles.title} accessibilityRole="header">
          Request Shift Swap
        </Text>
      </View>

      {/* Current Shift Card */}
      <Text weight="semibold" variant="sm" color={colors['on-surface-variant-color']} style={styles.sectionLabel} accessibilityRole="header">
        Your Current Shift
      </Text>
      <Card
        style={styles.shiftCard}
        accessible
        accessibilityLabel="Your current shift: Tuesday, May 12, 2026, 09:00 to 17:00, Waiter, Main Floor"
      >
        <View style={styles.timeRow}>
          <Text weight="bold" variant="lg" color={colors['on-surface-color']}>
            Tuesday, May 12, 2026
          </Text>
          <View style={[styles.timePill, { backgroundColor: colors['secondary-container-color'] }]}>
            <Text weight="semibold" variant="xs" color={colors['on-secondary-container-color']}>
              09:00 - 17:00
            </Text>
          </View>
        </View>
        <Text variant="base" weight="medium" color={colors['primary-color']}>
          Waiter · Main Floor
        </Text>
      </Card>

      {/* Target Coworker Selector Card */}
      <Text weight="semibold" variant="sm" color={colors['on-surface-variant-color']} style={styles.sectionLabel} accessibilityRole="header">
        Select Coworker to Swap With
      </Text>
      <Card
        style={styles.coworkerCard}
        accessible
        accessibilityLabel="Coworker to swap with: Marcus Vance, Available, Manager"
      >
        <View style={styles.coworkerRow}>
          <View
            style={[styles.coworkerAvatar, { backgroundColor: colors['primary-container-color'] }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text weight="bold" variant="base" color={colors['on-primary-container-color']}>
              MV
            </Text>
          </View>
          <View style={styles.coworkerInfo}>
            <Text weight="bold" variant="base" color={colors['on-surface-color']}>
              Marcus Vance
            </Text>
            <Badge label="Available · Manager" tone="emerald" />
          </View>
        </View>
      </Card>

      {/* Message Input */}
      <View style={styles.inputGroup}>
        <Text weight="semibold" variant="sm" color={colors['on-surface-color']}>
          Add a message (optional)
        </Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          accessibilityLabel="Add an optional message for shift swap"
          multiline
          numberOfLines={3}
          placeholder="e.g. I can cover your shift on Thursday..."
          placeholderTextColor={colors['outline-color']}
          style={[
            styles.textArea,
            {
              backgroundColor: colors['surface-container-lowest-color'],
              borderColor: colors['outline-variant-color'],
              color: colors['on-surface-color']
            }
          ]}
        />
      </View>

      {/* Primary Action Button */}
      <Button
        title="Send Request"
        accessibilityHint="Submits shift swap request to selected coworker"
        onPress={() => setCurrentScreenId(18)} // Trigger Screen 18 (Optimistic Update Screen)
        style={styles.sendButton}
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
    marginBottom: tokens.spacing[5]
  },
  backButton: {
    marginBottom: tokens.spacing[2],
    minHeight: tokens.accessibility.minTouchTarget,
    justifyContent: 'center'
  },
  title: {
    marginTop: tokens.spacing[1]
  },
  sectionLabel: {
    marginBottom: tokens.spacing[2],
    marginTop: tokens.spacing[2]
  },
  shiftCard: {
    gap: tokens.spacing[2],
    padding: tokens.spacing[4]
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  timePill: {
    paddingHorizontal: tokens.spacing[2.5],
    paddingVertical: tokens.spacing[1],
    borderRadius: tokens.radius.md
  },
  coworkerCard: {
    padding: tokens.spacing[4]
  },
  coworkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3]
  },
  coworkerAvatar: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  coworkerInfo: {
    gap: tokens.spacing[1]
  },
  inputGroup: {
    marginTop: tokens.spacing[4],
    gap: tokens.spacing[2]
  },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing[4],
    paddingTop: tokens.spacing[3],
    fontSize: tokens.typography.size.base,
    textAlignVertical: 'top'
  },
  sendButton: {
    marginTop: tokens.spacing[6]
  }
});
