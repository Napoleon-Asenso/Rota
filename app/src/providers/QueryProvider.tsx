import React, { useEffect } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager
} from '@tanstack/react-query';
import { AppState, AppStateStatus, Platform } from 'react-native';

/**
 * ============================================================================
 * TanStack Query Provider (Server State Tier)
 * ============================================================================
 * 
 * - 5-minute staleTime and 10-minute gcTime for shift rosters
 * - Automatic background re-fetching on app focus and network reconnection
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes for shift rosters
      gcTime: 10 * 60 * 1000,    // 10 minutes garbage collection lifetime
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2
    }
  }
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): React.JSX.Element {
  useEffect(() => {
    // Listen to React Native AppState changes to trigger automatic refetches when app regains focus
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });

    // Web browser focus/reconnection listeners
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = (): void => onlineManager.setOnline(true);
      const handleOffline = (): void => onlineManager.setOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        subscription.remove();
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
