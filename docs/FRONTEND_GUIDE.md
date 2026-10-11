# FRONTEND_GUIDE.md
## React Native (Expo) Mobile Client Architecture & Implementation Guide
**Project: Rota – Mobile-First Shift Scheduling & Workforce Coordination Platform**  
**Target Platform**: Android (Managed Expo Workflow, EAS Build, Expo SDK 51+)

---

## 1. Architecture Overview & Core Stack

```
app/
├── assets/                 # Brand assets, icons, splash screens
├── src/
│   ├── api/                # Axios instance, token refresh interceptor, API hooks
│   ├── components/         # Atomic reusable components (Buttons, Cards, Inputs, Modals)
│   ├── context/            # AuthContext, ThemeContext, NetworkContext
│   ├── hooks/              # useOfflineShifts, useQuietHours, useActivityFeed
│   ├── navigation/         # React Navigation (AuthStack, AppTabs, ManagerStack)
│   ├── screens/            # AgendaScreen, SwapsScreen, FeedScreen, SettingsScreen
│   ├── storage/            # SecureStore wrappers and encrypted MMKV/SQLite cache
│   ├── theme/              # Typed tokens generated from matisse-tokens-all.json
│   ├── types/              # Mobile TypeScript models and API DTOs
│   └── utils/              # Date formatters (date-fns), mutation expiration checks
├── app.json                # Expo configuration
├── package.json
└── tsconfig.json
```

---

## 2. Design System & Token Binding (`matisse-tokens-all.json`)

### 2.1 Rule of Binding
Every visual property must strictly consume values from [`matisse-tokens-all.json`](file:///c:/Dev/Rota/matisse-tokens-all.json). Arbitrary hex colors, raw numbers for spacing (e.g., `margin: 13`), or ad-hoc border radii are strictly forbidden.

### 2.2 Typed Token Adapter (`app/src/theme/tokens.ts`)
```typescript
import rawTokens from '../../../matisse-tokens-all.json';

export const tokens = {
  color: rawTokens.color,
  typography: rawTokens.typography,
  spacing: rawTokens.spacing,
  borderRadius: rawTokens.borderRadius,
  shadows: rawTokens.shadows,
  elevation: rawTokens.elevation
};

export type ThemeMode = 'light' | 'dark';
```

### 2.3 44x44pt Touch Target Ergonimics
Deskless workers interact with Rota on the move. All pressable surfaces must maintain a 44x44pt tap target minimum:
```typescript
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function TouchTargetButton({ onPress, children, accessibilityLabel }: any) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={({ pressed }) => [
        styles.target,
        { opacity: pressed ? 0.8 : 1.0 }
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
```

---

## 3. Navigation Architecture

```
RootNavigator
├── AuthStack (When unauthenticated)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── JoinTeamScreen (Invitation deeplink)
│
└── AppTabs (When authenticated)
    ├── AgendaTab (AgendaScreen: list of upcoming shifts, filter by day/week)
    ├── SwapsTab (SwapScreen: peer swaps, open pool drops, claim action)
    ├── FeedTab (FeedScreen: infinite cursor scroll of team operational events)
    └── SettingsTab (SettingsScreen: profile, quiet hours, push token, logout)
        └── (If Role == OWNER): BillingScreen, TeamMembersScreen
```

---

## 4. Hardware-Backed Token Storage & Networking

### 4.1 Token Storage (`expo-secure-store`)
- Access and Refresh tokens must NEVER be stored in unencrypted `AsyncStorage`.
- Implementation resides in `app/src/storage/secure-tokens.ts`:
  ```typescript
  import * as SecureStore from 'expo-secure-store';

  export async function setAuthTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
  }
  ```

### 4.2 Axios 401 Interceptor with 15-Second Grace Window
When access tokens expire (15-minute lifespan), the Axios interceptor halts parallel requests, executes `/api/v1/auth/refresh`, updates `expo-secure-store`, and replays original requests without logging the user out.

---

## 5. Offline Shift Caching & Mutation Expiration

### 5.1 Local Shift Cache Window
- The client persists published shifts for $[\text{today} - 14\text{ days}, \text{today} + 60\text{ days}]$ in encrypted MMKV / SQLite.
- Frontline staff working in store basements or hospital triage can always view their roster.

### 5.2 Offline Mutation Queue & Expiration Guard
When an action is initiated offline (e.g., claiming a shift or initiating a swap):
1. The mutation is saved to the offline queue with:
   $$\text{clientExpiresAt} = \min(\text{createdAt} + 2\text{ hours}, \text{shift.startTime} - 1\text{ hour})$$
2. Upon network reconnection:
   - If $\text{NOW}() > \text{clientExpiresAt}$, the mutation is discarded locally with an alert: *"Shift swap request expired before network connection was restored."*
   - Otherwise, the mutation is synchronized to the backend with its `clientMutationId`.

---

## 6. Timezone & Quiet Hours Configuration UI

In `app/src/screens/SettingsScreen.tsx`:
- Staff configure:
  - Quiet Hours Toggle (`quietHoursEnabled`).
  - Start Time Picker (`quietHoursStart`, default `"22:00"`).
  - End Time Picker (`quietHoursEnd`, default `"07:00"`).
  - Device Timezone (detected via `Intl.DateTimeFormat().resolvedOptions().timeZone` or manual selector).
- Values are synchronized via `PATCH /api/v1/users/me/quiet-hours`.
