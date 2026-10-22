import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface CachedShift {
  id: string;
  dayLabel: string;
  timeRange: string;
  roleAndVenue: string;
  status?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
}

export interface ShiftStoreState {
  // State
  activeFilter: string;
  selectedTab: string;
  upcomingShifts: CachedShift[];
  lastUpdated: string;

  // Actions
  setFilter: (filter: string) => void;
  setSelectedTab: (tab: string) => void;
  cacheUpcomingShifts: (shifts: CachedShift[]) => void;
  getOfflineShifts: () => CachedShift[];

  // Backward-compatibility & helper actions
  setUpcomingShifts: (shifts: CachedShift[]) => void;
  updateShiftSwapStatus: (shiftId: string, swapStatus: string) => void;
  clearShifts: () => void;
}

/**
 * Universal AsyncStorage adapter implementation.
 * Ensures compatibility across Web (localStorage), iOS/Android (SecureStore / Keystore).
 */
export const asyncStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
      }
      return await SecureStore.getItemAsync(name);
    } catch (err) {
      console.warn(`[AsyncStorageAdapter] getItem failed for ${name}:`, err);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(name, value);
        }
        return;
      }
      await SecureStore.setItemAsync(name, value);
    } catch (err) {
      console.warn(`[AsyncStorageAdapter] setItem failed for ${name}:`, err);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(name);
        }
        return;
      }
      await SecureStore.deleteItemAsync(name);
    } catch (err) {
      console.warn(`[AsyncStorageAdapter] removeItem failed for ${name}:`, err);
    }
  }
};

const DEFAULT_CACHED_SHIFTS: CachedShift[] = [
  {
    id: '1',
    dayLabel: 'Tue, May 27',
    timeRange: '9:00 AM - 5:00 PM',
    roleAndVenue: 'Waiter · Main Floor',
    status: 'Scheduled'
  },
  {
    id: '2',
    dayLabel: 'Wed, May 28',
    timeRange: '5:00 PM - 1:00 AM',
    roleAndVenue: 'Waiter · Main Floor',
    status: 'Scheduled'
  },
  {
    id: '3',
    dayLabel: 'Thu, May 29',
    timeRange: '9:00 AM - 5:00 PM',
    roleAndVenue: 'Waiter · Main Floor',
    status: 'Scheduled'
  }
];

export const useShiftStore = create<ShiftStoreState>()(
  persist(
    (set, get) => ({
      activeFilter: 'all',
      selectedTab: 'shifts',
      upcomingShifts: DEFAULT_CACHED_SHIFTS,
      lastUpdated: new Date().toISOString(),

      setFilter: (filter: string) => set({ activeFilter: filter }),
      setSelectedTab: (tab: string) => set({ selectedTab: tab }),

      cacheUpcomingShifts: (shifts: CachedShift[]) =>
        set({
          upcomingShifts: shifts,
          lastUpdated: new Date().toISOString()
        }),

      getOfflineShifts: () => get().upcomingShifts,

      // Aliases & helpers
      setUpcomingShifts: (shifts: CachedShift[]) =>
        set({
          upcomingShifts: shifts,
          lastUpdated: new Date().toISOString()
        }),

      updateShiftSwapStatus: (shiftId: string, swapStatus: string) =>
        set((state) => ({
          upcomingShifts: state.upcomingShifts.map((s) =>
            s.id === shiftId ? { ...s, status: swapStatus } : s
          )
        })),

      clearShifts: () =>
        set({
          upcomingShifts: [],
          lastUpdated: new Date().toISOString()
        })
    }),
    {
      name: 'rota_cached_shifts_store',
      storage: createJSONStorage(() => asyncStorageAdapter)
    }
  )
);
