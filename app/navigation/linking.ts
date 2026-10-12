import { useAppStore } from '../src/storage/store';

export interface NotificationPayloadData {
  screen?: 'ShiftDetails' | 'SwapRequests' | string;
  shiftId?: string;
  swapId?: string;
}

/**
 * Handles incoming push notification response / tap actions.
 * Deep links directly into the respective screen.
 */
export function handleNotificationResponse(data: NotificationPayloadData): void {
  const store = useAppStore.getState();

  if (data.screen === 'ShiftDetails' || data.shiftId) {
    console.log('[DeepLink] Navigating to Shift Calendar (Screen 7) for shift:', data.shiftId);
    store.setCurrentScreenId(7); // Screen 7: Shift Calendar
    return;
  }

  if (data.screen === 'SwapRequests' || data.swapId) {
    console.log('[DeepLink] Navigating to Swap Requests (Screen 18) for swap:', data.swapId);
    store.setCurrentScreenId(18); // Screen 18: Optimistic Update / Swap Requests
    return;
  }
}

/**
 * Sets up listeners for Expo Notifications response interactions.
 */
export function setupNotificationListeners(): () => void {
  let subscription: { remove: () => void } | null = null;

  try {
    // Dynamically load expo-notifications if available
    const Notifications = require('expo-notifications');
    if (Notifications && typeof Notifications.addNotificationResponseReceivedListener === 'function') {
      subscription = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const data = response?.notification?.request?.content?.data as NotificationPayloadData;
          if (data) {
            handleNotificationResponse(data);
          }
        }
      );
    }
  } catch {
    console.log('[DeepLink] expo-notifications listener safely handled in dev environment');
  }

  return () => {
    subscription?.remove();
  };
}
