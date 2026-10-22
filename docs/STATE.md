# STATE.md
## Rota – State Architecture & Data Synchronization Specification
**Lead Security & Systems Architecture: Three-Tier State, Password Hashing & Sharding**

---

### 1. Executive Summary & State Taxonomy

Rota employs a three-tier state management architecture designed for mobile-first deskless workforce coordination:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   APPLICATION STATE                                    │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│       SERVER STATE       │        CLIENT STATE         │        PERSISTED STATE        │
│     (TanStack Query)     │          (Zustand)          │ (SecureStore & Persistence)   │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Shift Rosters & Swaps  │ • Active Date Filter        │ • Access Token (JWT)          │
│ • Activity Feed Stream   │ • Selected Calendar Tab     │ • Rotated Refresh Token Hash  │
│ • Team Members & Roles   │ • Active Segment / Filter   │ • Offline Upcoming Shifts     │
│ • Subscription & Billing │ • Temporary Dialog States   │ • Last Sync ISO Timestamp     │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

### 2. Three-Tier State Hierarchy

| Tier | Primary Technology | Location | Cache Lifetime & Configuration | Invalidation Rules / Triggers |
| :--- | :--- | :--- | :--- | :--- |
| **Server State** | TanStack Query v5 (`@tanstack/react-query`) | Memory Cache | `staleTime: 5m`<br>`gcTime: 10m` for shift rosters | App focus (`focusManager`), network reconnect (`onlineManager`), mutations (`onSettled`) |
| **Client State** | Zustand v4 (`zustand`) | In-Memory Stores (`useAppStore`, `useShiftStore`) | App session lifetime | Screen switch, filter chip selection, date navigation |
| **Persisted State** | `expo-secure-store` & AsyncStorage persistence | Hardware Keystore / Keyring | Persistent across app restarts | User logout, token revocation, background sync |

---

### 3. Server State Architecture (`app/providers/QueryProvider.tsx`)

#### 3.1. QueryClient Configuration
Configured with enterprise defaults tailored for deskless workers in dynamic network conditions:
- **`staleTime`**: 5 minutes (`5 * 60 * 1000`) for shift rosters to reduce unnecessary network roundtrips.
- **`gcTime`**: 10 minutes (`10 * 60 * 1000`) keeping cached rosters in memory during screen navigation.
- **`refetchOnWindowFocus`**: Enabled via React Native `AppState` event listeners bound to `focusManager.setFocused(status === 'active')`.
- **`refetchOnReconnect`**: Enabled via `onlineManager.setOnline(true)` on reconnection.

#### 3.2. Query Endpoints & Invalidation Matrix

| Query Key | API Endpoint | Stale Time | Invalidation Triggers | Optimistic Handling |
| :--- | :--- | :--- | :--- | :--- |
| `['shifts', dateRange]` | `GET /api/shifts` | 5 minutes | `createShift`, `publishShifts`, `requestSwap`, `approveSwap` | Optimistically marked `"Awaiting approval"` |
| `['swaps']` | `GET /api/swaps` | 15 seconds | `requestSwap`, `approveSwap`, `cancelSwap` | In-flight swap badge update |
| `['activities']` | `GET /api/activities` | 30 seconds | `createShift`, `requestSwap`, `approveSwap` | Appended to infinite feed |
| `['team', 'members']` | `GET /api/teams/members` | 5 minutes | `inviteMember`, `deactivateMember`, role change | None |
| `['billing', 'subscription']` | `GET /api/billing/subscription` | 10 minutes | `updateSeats`, webhook completion | None |

---

### 4. Client & Persisted State (`app/stores/shiftStore.ts`)

#### 4.1. Zustand Persistent Store Schema
Managed via Zustand with `persist` middleware backed by an `AsyncStorage` adapter:
- **`activeFilter`**: Filter string (`'all'`, `'today'`, `'week'`).
- **`selectedTab`**: Active calendar/roster tab (`'shifts'`, `'calendar'`, `'my_shifts'`).
- **`upcomingShifts`**: Array of `CachedShift` objects displayed during offline periods.
- **`lastUpdated`**: ISO timestamp recording the last successful background sync.

#### 4.2. Store Actions
- `setFilter(filter: string)`: Updates active roster filter.
- `setSelectedTab(tab: string)`: Switches active calendar tab.
- `cacheUpcomingShifts(shifts: CachedShift[])`: Updates cached shifts and updates `lastUpdated`.
- `getOfflineShifts()`: Returns array of cached shifts for immediate offline viewing.
- `updateShiftSwapStatus(shiftId: string, swapStatus: string)`: Optimistically marks a shift status in the local store.

---

### 5. Optimistic Updates with Rollback (`app/hooks/useOptimisticSwap.ts`)

For shift swap requests, sub-50ms instant UI response is guaranteed:
1. **`onMutate`**:
   - Cancels outgoing queries for `['shifts']` to prevent race conditions.
   - Snapshots existing query data from `queryClient.getQueryData(['shifts'])`.
   - Snapshots local store upcoming shifts from `useShiftStore.getState().upcomingShifts`.
   - Optimistically updates the targeted shift in the TanStack cache and Zustand store to `"Awaiting approval"`.
   - Returns `{ previousShifts, previousStoreShifts }` context.
2. **`onError`**:
   - Reverts TanStack query cache to `context.previousShifts`.
   - Reverts Zustand store shifts to `context.previousStoreShifts`.
   - Triggers native error alert informing user of the network/permission failure.
3. **`onSettled`**:
   - Invalidates `['shifts']`, `['activities']`, and `['swaps']` to reconcile with server state.

---

### 6. Security & Cryptographic Specifications (`server/src/utils/security.ts`)

#### 6.1. Password Hashing (Argon2id & Bcrypt Fallback)
- **Argon2id (OWASP Compliant)**:
  - `type`: `argon2.argon2id` (type 2)
  - `memoryCost`: 65536 (64 MB RAM)
  - `timeCost`: 3 iterations
  - `parallelism`: 1 thread
  - `saltLength`: 16 bytes
- **Bcrypt Fallback**:
  - `saltRounds`: 12 rounds
- **Zero Logging**: Plaintext passwords are never logged or exposed in stack traces.
- **Constant-Time Verification**: `verifyPassword()` uses constant-time string and hash comparison to eliminate timing attacks.

#### 6.2. SHA-256 Token Storage
- Refresh tokens are hashed via `crypto.createHash('sha256').update(token).digest('hex')` prior to database persistence.
- Raw refresh tokens are never stored in the database.

---

### 7. Database Sharding Hash Router (`server/src/db/shardingRouter.ts`)

#### 7.1. Deterministic Shard Selection
Workloads across tenant boundaries are routed using SHA-256 hashing:
```typescript
import crypto from 'crypto';

export function selectShard(teamId: string): 'shard1' | 'shard2' {
  const hash = crypto.createHash('sha256').update(teamId).digest('hex');
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  return hashNumber % 2 === 0 ? 'shard1' : 'shard2';
}
```

#### 7.2. Central Directory vs. Tenant Workloads
- **Central Directory (`shard1` / Shard 0)**:
  - `User`, `Team`, `TeamMembership`, `RefreshToken`, `DeviceToken`.
- **Tenant Operations (`selectShard(teamId)`)**:
  - `Shift`, `ShiftSwapRequest`, `ActivityFeedItem`, `Subscription`, `SubscriptionLedger`.
- **Referential Integrity**:
  - Managed at the application layer with `relationMode = "prisma"`, eliminating cross-database foreign key constraints.
