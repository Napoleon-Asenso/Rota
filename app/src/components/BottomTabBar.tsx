import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { useAppStore } from '../storage/store';
import { Text } from './Text';
import { Tappable } from './Tappable';

export type BottomTabId = 'home' | 'schedule' | 'activity' | 'more';

interface TabDefinition {
  id: BottomTabId;
  label: string;
  screenId: number;
}

const TABS: readonly TabDefinition[] = [
  { id: 'home', label: 'Home', screenId: 7 },
  { id: 'schedule', label: 'Schedule', screenId: 7 },
  { id: 'activity', label: 'Activity', screenId: 8 },
  { id: 'more', label: 'More', screenId: 11 }
];

export interface BottomTabBarProps {
  activeTab: BottomTabId;
}

export function BottomTabBar({ activeTab }: BottomTabBarProps): React.JSX.Element {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: colors['surface-container-lowest-color'],
          borderTopColor: colors['outline-variant-color']
        }
      ]}
    >
      {TABS.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <Tappable
            key={tab.id}
            onPress={() => setCurrentScreenId(tab.screenId)}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label}, tab ${index + 1} of ${TABS.length}`}
            accessibilityState={{ selected: isActive }}
            style={styles.tab}
          >
            <Text
              weight={isActive ? 'bold' : 'medium'}
              variant="xs"
              color={isActive ? colors['primary-color'] : colors['on-surface-variant-color']}
            >
              {tab.label}
            </Text>
          </Tappable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    minHeight: tokens.spacing[14],
    paddingVertical: tokens.spacing[1],
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  tab: {
    // Each tab fills an equal share of the bar so the whole strip is tappable, not just the label
    flex: 1,
    alignItems: 'center'
  }
});
