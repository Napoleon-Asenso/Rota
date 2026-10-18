import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Badge, BadgeTone } from '../components/Badge';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Tappable } from '../components/Tappable';
import { useAppStore } from '../storage/store';
import { UserPlus, Users } from 'lucide-react-native';

export function TeamMembersScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  const members = [
    { id: '1', name: 'Elena Rostova', email: 'elena@bistro.com', role: 'Owner', tone: 'purple' as BadgeTone },
    { id: '2', name: 'Marcus Vance', email: 'marcus@bistro.com', role: 'Manager', tone: 'blue' as BadgeTone },
    { id: '3', name: 'Emeka Okafor', email: 'emeka@bistro.com', role: 'Staff', tone: 'neutral' as BadgeTone },
    { id: '4', name: 'Jane Doe', email: 'jane@bistro.com', role: 'Staff', tone: 'neutral' as BadgeTone },
    { id: '5', name: 'Alex Rivera', email: 'alex@bistro.com', role: 'Staff', tone: 'neutral' as BadgeTone }
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors['background-color'] }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text weight="bold" variant="3xl" color={colors['on-background-color']} accessibilityRole="header">
            Team Members
          </Text>
          <Text variant="base" color={colors['on-surface-variant-color']} style={styles.subtitle}>
            5 members · 3 roles
          </Text>
        </View>

        <View style={styles.memberList}>
          {members.map((member) => (
            <Card
              key={member.id}
              variant="elevated"
              style={styles.memberCard}
              accessible
              accessibilityLabel={`${member.name}, ${member.email}, ${member.role}`}
            >
              <View style={styles.row}>
                <View
                  style={[styles.avatar, { backgroundColor: colors['primary-container-color'] }]}
                  importantForAccessibility="no-hide-descendants"
                >
                  <Text weight="bold" variant="base" color={colors['on-primary-container-color']}>
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>

                <View style={styles.details}>
                  <Text weight="semibold" variant="base" color={colors['on-surface-color']}>
                    {member.name}
                  </Text>
                  <Text variant="sm" color={colors['on-surface-variant-color']}>
                    {member.email}
                  </Text>
                </View>

                <Badge label={member.role} tone={member.tone} />
              </View>
            </Card>
          ))}
        </View>

        <Button
          title="Go to Subscription & Billing"
          variant="secondary"
          onPress={() => setCurrentScreenId(6)}
          style={styles.navButton}
        />
      </ScrollView>

      {/* Floating Action Button (+) */}
      <Tappable
        onPress={() => setCurrentScreenId(4)} // Quick invite modal/screen
        accessibilityLabel="Invite team member"
        style={[styles.fab, { backgroundColor: colors['primary-color'] }]}
      >
        <UserPlus size={24} color={colors['on-primary-color']} />
      </Tappable>
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
    paddingBottom: tokens.spacing[24]
  },
  header: {
    marginBottom: tokens.spacing[6],
    maxWidth: tokens.layout.heroMaxWidth,
    width: '100%'
  },
  subtitle: {
    marginTop: tokens.spacing[1.5],
    flexWrap: 'wrap'
  },
  memberList: {
    gap: tokens.accessibility.touchTargetGap
  },
  memberCard: {
    paddingVertical: tokens.spacing[3.5],
    paddingHorizontal: tokens.spacing[4]
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing[3]
  },
  details: {
    flex: 1,
    gap: tokens.spacing[0.5]
  },
  navButton: {
    marginTop: tokens.spacing[6]
  },
  fab: {
    position: 'absolute',
    bottom: tokens.spacing[8],
    right: tokens.spacing[6],
    width: 56,
    height: 56,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8
  }
});
