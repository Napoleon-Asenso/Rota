import { Platform } from 'react-native';
import { apiClient } from '../src/services/api';

/**
 * Registers the device for push notifications and sends token to backend.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    // Attempt dynamic import of expo-notifications if available
    const Notifications = await import('expo-notifications');
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Notification permissions not granted');
      return null;
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    token = pushTokenData.data;
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
