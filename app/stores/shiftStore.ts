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

interface ShiftStoreState {
  upcomingShifts: CachedShift[];
  lastUpdated: string | null;
  setUpcomingShifts: (shifts: CachedShift[]) => void;
  updateShiftSwapStatus: (shiftId: string, swapStatus: string) => void;
  clearShifts: () => void;
}

// Storage adapter supporting both native SecureStore and Web localStorage
const secureStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
    }
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(name, value);
      }
      return;
    }
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(name);
      }
      return;
    }
    await SecureStore.deleteItemAsync(name);
  }
};

const DEFAULT_CACHED_SHIFTS: CachedShift[] = [
  {
    id: '1',
    dayLabel: 'Tue, May 27',
    timeRange: '9:00 AM - 5:00 PM',
    roleAndVenue: 'Waiter · Main Floor'
  },
  {
    id: '2',
    dayLabel: 'Wed, May 28',
    timeRange: '5:00 PM - 1:00 AM',
    roleAndVenue: 'Waiter · Main Floor'
  },
  {
    id: '3',
    dayLabel: 'Thu, May 29',
    timeRange: '9:00 AM - 5:00 PM',
    roleAndVenue: 'Waiter · Main Floor'
  }
];

export const useShiftStore = create<ShiftStoreState>()(
  persist(
    (set) => ({
      upcomingShifts: DEFAULT_CACHED_SHIFTS,
      lastUpdated: new Date().toISOString(),
      setUpcomingShifts: (shifts) =>
        set({
          upcomingShifts: shifts,
          lastUpdated: new Date().toISOString()
        }),
      updateShiftSwapStatus: (shiftId, swapStatus) =>
        set((state) => ({
          upcomingShifts: state.upcomingShifts.map((s) =>
            s.id === shiftId ? { ...s, status: swapStatus } : s
          )
        })),
      clearShifts: () => set({ upcomingShifts: [], lastUpdated: null })
    }),
    {
      name: 'rota_cached_shifts_store',
      storage: createJSONStorage(() => secureStorageAdapter)
    }
  )
);
