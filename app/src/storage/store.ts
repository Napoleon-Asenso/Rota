import { create } from 'zustand';

export interface AppShift {
  id: string;
  timeRange: string;
  roleAndVenue: string;
  status: string;
  dateStr: string;
}

export interface AppActivity {
  id: string;
  title: string;
  details: string;
  timeAgo: string;
  badge?: string;
  badgeTone?: 'emerald' | 'amber' | 'blue';
  category: string;
}

interface AppState {
  currentScreenId: number;
  screenHistory: number[];
  setCurrentScreenId: (id: number) => void;
  navigate: (id: number) => void;
  goBack: () => void;
  isOffline: boolean;
  setIsOffline: (val: boolean) => void;
  activeSegment: string;
  setActiveSegment: (val: string) => void;
  activeFilterChip: string;
  setActiveFilterChip: (val: string) => void;
  selectedCalendarDay: number;
  setSelectedCalendarDay: (day: number) => void;
  notificationToggles: {
    shiftChanges: boolean;
    swapRequests: boolean;
    approvals: boolean;
    teamMessages: boolean;
  };
  quietHours: {
    start: string;
    end: string;
    timezone: string;
  };
  setNotificationToggle: (key: 'shiftChanges' | 'swapRequests' | 'approvals' | 'teamMessages', val: boolean) => void;
  setQuietHours: (start: string, end: string) => void;
  setTimezone: (tz: string) => void;
  setAllSettings: (settings: {
    shiftChanges?: boolean;
    swapRequests?: boolean;
    approvals?: boolean;
    teamMessages?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
  }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreenId: 1, // Start at Screen 1 (Welcome)
  screenHistory: [1],
  setCurrentScreenId: (id) =>
    set((state) => ({
      currentScreenId: id,
      screenHistory: state.currentScreenId !== id ? [...state.screenHistory, state.currentScreenId] : state.screenHistory
    })),
  navigate: (id) =>
    set((state) => ({
      currentScreenId: id,
      screenHistory: state.currentScreenId !== id ? [...state.screenHistory, state.currentScreenId] : state.screenHistory
    })),
  goBack: () =>
    set((state) => {
      if (state.screenHistory.length > 0) {
        const nextHistory = [...state.screenHistory];
        const previousId = nextHistory.pop() || 1;
        return {
          currentScreenId: previousId,
          screenHistory: nextHistory.length > 0 ? nextHistory : [1]
        };
      }
      return { currentScreenId: 1, screenHistory: [1] };
    }),
  isOffline: false,
  setIsOffline: (val) => set({ isOffline: val }),
  activeSegment: 'Calendar',
  setActiveSegment: (val) => set({ activeSegment: val }),
  activeFilterChip: 'All',
  setActiveFilterChip: (val) => set({ activeFilterChip: val }),
  selectedCalendarDay: 12, // May 12
  setSelectedCalendarDay: (day) => set({ selectedCalendarDay: day }),
  notificationToggles: {
    shiftChanges: true,
    swapRequests: true,
    approvals: true,
    teamMessages: false
  },
  quietHours: {
    start: '22:00',
    end: '06:00',
    timezone: 'Africa/Lagos'
  },
  setNotificationToggle: (key, val) =>
    set((state) => ({
      notificationToggles: { ...state.notificationToggles, [key]: val }
    })),
  setQuietHours: (start, end) =>
    set((state) => ({
      quietHours: { ...state.quietHours, start, end }
    })),
  setTimezone: (tz) =>
    set((state) => ({
      quietHours: { ...state.quietHours, timezone: tz }
    })),
  setAllSettings: (settings) =>
    set((state) => ({
      notificationToggles: {
        shiftChanges: settings.shiftChanges ?? state.notificationToggles.shiftChanges,
        swapRequests: settings.swapRequests ?? state.notificationToggles.swapRequests,
        approvals: settings.approvals ?? state.notificationToggles.approvals,
        teamMessages: settings.teamMessages ?? state.notificationToggles.teamMessages
      },
      quietHours: {
        start: settings.quietHoursStart ?? state.quietHours.start,
        end: settings.quietHoursEnd ?? state.quietHours.end,
        timezone: settings.timezone ?? state.quietHours.timezone
      }
    }))
}));
