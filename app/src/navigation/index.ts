import { useAppStore } from '../storage/store';

export const AppScreens = {
  Splash: 1,
  SignUp: 2,
  Login: 3,
  InviteMembers: 4,
  TeamManagement: 5,
  SubscriptionBilling: 6,
  Dashboard: 7, // Shift Calendar Screen
  ActivityFeed: 8,
  RequestSwap: 9,
  PushSettings: 10,
  UserSettings: 11,
  OfflineViewing: 12
} as const;

export type AppScreenName = keyof typeof AppScreens;

/**
 * Typed client-side Stack Navigation Hook for Rota.
 * Manages smooth screen transitions with back stack history:
 * - Splash -> Sign Up -> Invite Members -> Dashboard
 * - Splash -> Log In -> Dashboard
 */
export function useAppNavigation() {
  const currentScreenId = useAppStore((s) => s.currentScreenId);
  const screenHistory = useAppStore((s) => s.screenHistory);
  const navigate = useAppStore((s) => s.navigate);
  const goBack = useAppStore((s) => s.goBack);
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  return {
    currentScreenId,
    screenHistory,
    navigate,
    goBack,
    setCurrentScreenId,

    // Named transition helpers for Milestone 1
    goToSplash: () => navigate(AppScreens.Splash),
    goToSignUp: () => navigate(AppScreens.SignUp),
    goToLogin: () => navigate(AppScreens.Login),
    goToInviteMembers: () => navigate(AppScreens.InviteMembers),
    goToDashboard: () => navigate(AppScreens.Dashboard)
  };
}
