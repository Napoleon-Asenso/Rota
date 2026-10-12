import { Platform } from 'react-native';
import { apiClient } from '../src/services/api';

/**
 * Registers the device for push notifications and sends token to backend.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    // Attempt optional require of expo-notifications if available in runtime environment
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications: any = typeof require !== 'undefined' ? (require as any)('expo-notifications') : null;
    if (Notifications && typeof Notifications.getPermissionsAsync === 'function') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted' && typeof Notifications.getExpoPushTokenAsync === 'function') {
        const pushTokenData = await Notifications.getExpoPushTokenAsync();
        token = pushTokenData?.data || null;
      }
    }
  } catch (err) {
    // Safe fallback for web, simulator, or testing environments
    console.log('[Push] Running in dev / web fallback mode');
    token = `ExponentPushToken[mock_device_token_${Platform.OS}_${Date.now()}]`;
  }

  if (token) {
    try {
      await apiClient.post('/api/devices/token', {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'
      });
      console.log('[Push] Device token successfully registered with server:', token);
    } catch (apiErr: any) {
      console.warn('[Push] Failed to register token with backend:', apiErr?.message);
    }
  }

  return token;
}
