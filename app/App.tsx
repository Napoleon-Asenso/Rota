import React from 'react';
import { View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useAppStore } from './src/storage/store';

// Ensure html, body, and root containers occupy 100vh on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rota-100vh-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html, body, #root {
        height: 100% !important;
        min-height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        flex: 1 1 0% !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// 19 Screens Imports
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { InviteMembersScreen } from './src/screens/InviteMembersScreen';
import { TeamMembersScreen } from './src/screens/TeamMembersScreen';
import { SubscriptionBillingScreen } from './src/screens/SubscriptionBillingScreen';
import { ShiftCalendarScreen } from './src/screens/ShiftCalendarScreen';
import { ActivityFeedScreen } from './src/screens/ActivityFeedScreen';
import { RequestSwapScreen } from './src/screens/RequestSwapScreen';
import { PushNotificationSettingsScreen } from './src/screens/PushNotificationSettingsScreen';
import { UserSettingsScreen } from './src/screens/UserSettingsScreen';
import { OfflineViewingScreen } from './src/screens/OfflineViewingScreen';
import { FeedLoadingStateScreen } from './src/screens/FeedLoadingStateScreen';
import { FeedEmptyStateScreen } from './src/screens/FeedEmptyStateScreen';
import { FeedEndOfListScreen } from './src/screens/FeedEndOfListScreen';
import { FeedErrorStateScreen } from './src/screens/FeedErrorStateScreen';
import { FeedInfiniteScrollScreen } from './src/screens/FeedInfiniteScrollScreen';
import { OptimisticUpdateScreen } from './src/screens/OptimisticUpdateScreen';
import { SwapDetailReviewScreen } from './src/screens/SwapDetailReviewScreen';

const SCREENS = [
  { id: 1, title: 'Screen 1: Welcome / Splash', component: WelcomeScreen },
  { id: 2, title: 'Screen 2: Sign Up', component: SignUpScreen },
  { id: 3, title: 'Screen 3: Log In', component: LoginScreen },
  { id: 4, title: 'Screen 4: Invite Team Members', component: InviteMembersScreen },
  { id: 5, title: 'Screen 5: Team & Role Management', component: TeamMembersScreen },
  { id: 6, title: 'Screen 6: Subscription & Billing', component: SubscriptionBillingScreen },
  { id: 7, title: 'Screen 7: Shift Calendar', component: ShiftCalendarScreen },
  { id: 8, title: 'Screen 8: Activity Feed (Cursor)', component: ActivityFeedScreen },
  { id: 9, title: 'Screen 9: Request Shift Swap', component: RequestSwapScreen },
  { id: 10, title: 'Screen 10: Push Notification Settings', component: PushNotificationSettingsScreen },
  { id: 11, title: 'Screen 11: User Settings', component: UserSettingsScreen },
  { id: 12, title: 'Screen 12: Offline Viewing', component: OfflineViewingScreen },
  { id: 13, title: 'Screen 13: Feed (Loading State)', component: FeedLoadingStateScreen },
  { id: 14, title: 'Screen 14: Feed (Empty State)', component: FeedEmptyStateScreen },
  { id: 15, title: 'Screen 15: Feed (End of List)', component: FeedEndOfListScreen },
  { id: 16, title: 'Screen 16: Feed (Error State)', component: FeedErrorStateScreen },
  { id: 17, title: 'Screen 17: Feed (Infinite Scroll)', component: FeedInfiniteScrollScreen },
  { id: 18, title: 'Screen 18: Optimistic Update', component: OptimisticUpdateScreen },
  { id: 19, title: 'Screen 19: Swap Review & Approval', component: SwapDetailReviewScreen }
];

import { setupNotificationListeners } from './src/navigation/linking';
import { registerForPushNotificationsAsync } from './src/services/notifications';

function MainContent(): React.JSX.Element {
  const { colors } = useTheme();
  const currentScreenId = useAppStore((s) => s.currentScreenId);

  const activeScreen = SCREENS.find((s) => s.id === currentScreenId) || SCREENS[0];
  const Component = activeScreen.component;

  // Match the dark cinematic background of WelcomeScreen so no blank white page ever appears on scroll or overscroll
  const screenBg = currentScreenId === 1 ? '#070A10' : colors['background-color'];

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = screenBg;
      document.body.style.backgroundColor = screenBg;
    }
  }, [screenBg]);

  // Milestone 10: Push Token Registration & Deep-Linking Response Listener
  React.useEffect(() => {
    const cleanup = setupNotificationListeners();
    registerForPushNotificationsAsync().catch((err) => {
      console.log('[Push] Push registration handled gracefully:', err?.message);
    });
    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: screenBg }]}>
      <View style={[styles.screenWrapper, { backgroundColor: screenBg }]}>
        <Component />
      </View>
    </SafeAreaView>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30
    }
  }
});

export default function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MainContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  screenWrapper: {
    flex: 1
  }
});
