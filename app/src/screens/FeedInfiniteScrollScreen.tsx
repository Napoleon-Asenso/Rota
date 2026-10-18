import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Tappable } from '../components/Tappable';
import { InfiniteScrollFooter } from '../components/feed/InfiniteScrollFooter';
import { useAppStore } from '../storage/store';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

export function FeedInfiniteScrollScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  const [items] = useState([
    { id: '1', title: 'Shift completed', details: 'Marcus Vance confirmed 09:00 - 17:00 shift', time: '10m ago' },
    { id: '2', title: 'Roster published', details: 'Full weekly roster published for week 20', time: '2h ago' },
    { id: '3', title: 'Swap approved', details: 'Peer swap approved for Elena Rostova', time: '4h ago' },
    { id: '4', title: 'New staff assigned', details: 'Emeka Okafor assigned to Friday evening dinner', time: '1d ago' },
    { id: '5', title: 'Shift draft created', details: 'Sunday morning brunch draft created', time: '2d ago' }
  ]);

  return (
    <View style={[styles.root, { backgroundColor: colors['background-color'] }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Tappable
          onPress={() => setCurrentScreenId(8)}
          style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
          accessibilityRole="button"
          accessibilityLabel="Back to Activity Feed"
        >
          <ArrowLeft size={16} color={colors['primary-color']} />
          <Text weight="semibold" variant="sm" color={colors['primary-color']}>
            Back to Activity Feed
          </Text>
        </Tappable>

        <View style={styles.header}>
          <Text
            weight="bold"
            variant="3xl"
            color={colors['on-background-color']}
            accessibilityRole="header"
          >
            Activity Feed (Paging)
          </Text>
          <Text
            variant="sm"
            color={colors['on-surface-variant-color']}
            style={styles.sub}
            accessibilityLabel="Cursor token: created at October 9, 2026"
          >
            Cursor: eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTA5...
          </Text>
        </View>

        <View style={styles.list} accessibilityRole="list">
          {items.map((item) => (
            <Card
              key={item.id}
              variant="elevated"
              style={styles.itemCard}
              accessible={true}
              accessibilityRole="summary"
              accessibilityLabel={`${item.title}. ${item.details}. ${item.time}.`}
            >
              <View style={styles.topRow}>
                <Text weight="bold" variant="base" color={colors['on-surface-color']}>
                  {item.title}
                </Text>
                <Text variant="xs" color={colors['outline-color']}>
                  {item.time}
                </Text>
              </View>
              <Text variant="sm" color={colors['on-surface-variant-color']}>
                {item.details}
              </Text>
            </Card>
          ))}
        </View>

        {/* Footer Spinner: "Loading more..." */}
        <InfiniteScrollFooter loading={true} />

        <Tappable
          onPress={() => setCurrentScreenId(18)}
          style={[styles.nextLink, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
          accessibilityRole="button"
          accessibilityLabel="Go to Screen 18: Optimistic Update"
        >
          <Text variant="sm" weight="semibold" color={colors['primary-color']}>
            Next Screen: Optimistic Update (Screen 18)
          </Text>
          <ArrowRight size={16} color={colors['primary-color']} />
        </Tappable>
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
    minHeight: '100%',
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[12],
    paddingBottom: tokens.spacing[12]
  },
  backButton: {
    marginBottom: tokens.spacing[2],
    minHeight: tokens.accessibility.minTouchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start'
  },
  header: {
    marginBottom: tokens.spacing[4]
  },
  sub: {
    marginTop: tokens.spacing[1]
  },
  list: {
    gap: tokens.spacing[3]
  },
  itemCard: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[1.5]
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2.5],
    paddingVertical: tokens.spacing[5],
    minHeight: tokens.accessibility.minTouchTarget
  },
  nextLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing[4],
    minHeight: tokens.accessibility.minTouchTarget,
    paddingVertical: tokens.spacing[2]
  }
});
