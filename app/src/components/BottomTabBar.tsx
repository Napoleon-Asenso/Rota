import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { useAppStore } from '../storage/store';
import { Text } from './Text';
import { Tappable } from './Tappable';
import { Home, Calendar, Activity, MoreHorizontal } from 'lucide-react-native';

export type BottomTabId = 'home' | 'schedule' | 'activity' | 'more';

interface TabDefinition {
  id: BottomTabId;
  label: string;
  screenId: number;
  icon: (props: { size: number; color: string }) => React.JSX.Element;
}

const TABS: readonly TabDefinition[] = [
  { id: 'home', label: 'Home', screenId: 7, icon: ({ size, color }) => <Home size={size} color={color} /> },
  { id: 'schedule', label: 'Schedule', screenId: 7, icon: ({ size, color }) => <Calendar size={size} color={color} /> },
  { id: 'activity', label: 'Activity', screenId: 8, icon: ({ size, color }) => <Activity size={size} color={color} /> },
  { id: 'more', label: 'More', screenId: 11, icon: ({ size, color }) => <MoreHorizontal size={size} color={color} /> }
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
        const iconColor = isActive ? colors['primary-color'] : colors['on-surface-variant-color'];
        return (
          <Tappable
            key={tab.id}
            onPress={() => setCurrentScreenId(tab.screenId)}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label}, tab ${index + 1} of ${TABS.length}`}
            accessibilityState={{ selected: isActive }}
            style={styles.tab}
          >
            {tab.icon({ size: 20, color: iconColor })}
            <Text
              weight={isActive ? 'bold' : 'medium'}
              variant="xs"
              color={iconColor}
              style={styles.tabLabel}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  tabLabel: {
    marginTop: 2
  }
});
