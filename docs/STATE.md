# STATE.md
## Rota – State Architecture & Data Synchronization Specification
**Milestone 8: TanStack Query, Cursor Pagination & Offline Persistence**

---

### 1. Executive Summary & State Taxonomy

Rota employs a tri-tiered state architecture designed for mobile-first deskless workforce coordination. By decoupling ephemeral UI state from asynchronous server cache and hardware-backed device persistence, the application ensures zero data tearing, instant UI responsiveness, and offline resilience in adverse network conditions (e.g. restaurant basements, hospital wards).

```
┌────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION STATE                             │
├───────────────────┬──────────────────────┬─────────────────────────────┤
│   SERVER STATE    │     CLIENT STATE     │       PERSISTED STATE       │
│  (TanStack Query) │      (Zustand)       │ (SecureStore & Persistence) │
├───────────────────┼──────────────────────┼─────────────────────────────┤
│ • Activity Feed   │ • Active Segment     │ • Access Token (JWT)        │
│ • Shifts Schedule │ • Filter Chips       │ • Refresh Token (Rotated)   │
│ • Swap Requests   │ • Calendar Day       │ • Upcoming Shifts (Offline) │
│ • Team Members    │ • Screen Navigation  │ • Last Sync Timestamp       │
│ • Subscription    │ • Dev Preview States │ • Biometric / Device Info   │
└───────────────────┴──────────────────────┴─────────────────────────────┘
```

---

### 2. Tri-Tiered State Hierarchy

| Layer | Primary Technology | Location | Lifetime | Invalidation / Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **Server State** | TanStack Query v5 (`@tanstack/react-query`) | Memory Cache | `staleTime: 30s`<br>`gcTime: 5m` | Network fetch, manual refetch, optimistic mutation settle |
| **Client State** | Zustand v4 (`zustand`) | In-Memory Stores (`useAppStore`) | App session | User interaction, screen switch, filter selection |
| **Persisted State** | `expo-secure-store` & Zustand `persist` | Hardware Keystore / Keyring | Persistent | Explicit logout, token expiration, background sync |

---

### 3. Server State Architecture (TanStack Query)

#### 3.1. Query Key Hierarchy & Cache Invalidation Matrix

| Query Key | Endpoint | Stale Time | Invalidation Triggers | Optimistic Mutation |
| :--- | :--- | :--- | :--- | :--- |
| `['activities', category]` | `GET /api/activities` | 30 seconds | • `createShift`<br>• `requestSwap`<br>• `approveSwap`<br>• Pull-to-refresh | Appends feed card |
| `['shifts', dateRange]` | `GET /api/shifts` | 60 seconds | • `createShift`<br>• `publishShifts`<br>• `approveSwap` | Optimistic status update |
| `['swaps']` | `GET /api/swaps` | 15 seconds | • `requestSwap`<br>• `approveSwap` | In-flight swap badge |
| `['team', 'members']` | `GET /api/teams/members` | 5 minutes | • `inviteMember`<br>• Role change | None |
| `['billing', 'subscription']` | `GET /api/billing/subscription` | 10 minutes | • `updateSeats`<br>• Webhook execution | None |

#### 3.2. Infinite Cursor Pagination Engine (`useActivityFeed`)
- **Query Function**: Calls `GET /api/activities` with composite base64 cursor encoding `(createdAt, id)` and limit 20.
- **Cursor Resolution**: `getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined`.
- **List Binding**: Bound to `@shopify/flash-list` with `onEndReached` guarded by `hasNextPage && !isFetchingNextPage`.
- **UI State Routing**:
  1. `isLoading` $\rightarrow$ Screen 13 (`LoadingState` skeleton)
  2. `displayItems.length === 0` $\rightarrow$ Screen 14 (`EmptyState` vector card)
  3. `!hasNextPage && items.length > 0` $\rightarrow$ Screen 15 (`EndOfListState` indicator)
  4. `isError` $\rightarrow$ Screen 16 (`ErrorState` with retry action)
  5. `isFetchingNextPage` $\rightarrow$ Screen 17 (`InfiniteScrollFooter` activity loader)

#### 3.3. Optimistic Shift Swaps (`useShiftSwaps`)
Shift swap mutations guarantee sub-50ms visual response through TanStack Query optimistic updates:
1. **`onMutate`**:
   - Cancels outgoing queries for `['shifts']` and `['swaps']`.
   - Snapshots previous query cache into the context object.
   - Optimistically patches the target shift in the cache with `swapStatus: 'PENDING'` and `isRequestingSwap: true`.
   - UI instantly renders Screen 18 ("Requesting swap..." blue badge with disabled action button).
2. **`onError`**:
   - Restores the cached shifts from `context.previousShifts`.
   - Emits an error toast to the user.
3. **`onSettled`**:
   - Triggers `queryClient.invalidateQueries` for `['shifts']`, `['swaps']`, and `['activities']` to reconcile with server state.

---

### 4. Client State Architecture (Zustand)

#### 4.1. Navigation & Ephemeral View State (`useAppStore`)
Located at `app/src/storage/store.ts`:
- `currentScreenId`: Active screen index (Screens 1 through 19).
- `screenHistory`: Stack array tracking navigation history for native back-button actions.
- `activeFilterChip`: Feed filter selection (`All`, `Shifts`, `Swaps`, `Changes`).
- `selectedCalendarDay`: Day of month integer for calendar agenda views.
- `notificationToggles`: Ephemeral UI preferences for shift changes, swap requests, and manager approvals.
- `isOffline`: Boolean flag reflecting network reachability.

---

### 5. Persisted State & Offline Cache

#### 5.1. Encrypted Authentication Tokens
- **Storage Target**: Hardware-backed encrypted `expo-secure-store` on Android/iOS (with memory/localStorage fallback on web development).
- **Stored Keys**:
  - `rota_access_token`: Short-lived JWT (15-minute expiration).
  - `rota_refresh_token`: Cryptographically random UUID token (7-day sliding window with 15-second grace period).
- **Rule Enforcement**: Strict prohibition of `@react-native-async-storage/async-storage` for tokens, passwords, or encryption keys.

#### 5.2. Offline Upcoming Shifts (`useShiftStore`)
Located at `app/stores/shiftStore.ts`:
- **State Properties**:
  - `upcomingShifts: CachedShift[]`: Array of upcoming shifts for the active user.
  - `lastUpdated: string | null`: ISO timestamp of the last successful background sync.
- **Persistence Mechanism**: Built with Zustand `persist` middleware using custom `secureStorageAdapter`.
- **Offline Viewing Screen** (Screen 12):
  - When disconnected, reads cached records from `useShiftStore`.
  - Displays persistent floating offline banner: `"You're offline. Showing cached data"`.
  - Disables mutating actions (requesting swaps, claiming shifts) to avoid mutation expiration errors.

---

### 6. Architectural Guarantees & Constraints Checklist

- [x] **Zero SQL OFFSET**: Activity pagination strictly uses index scans on `(team_id, created_at DESC, id DESC)`.
- [x] **Integer-Cent Monetary State**: All billing calculations on backend use whole minor currency units (cents).
- [x] **Strict Tenant Scoping**: Every server query verifies `req.user.teamId`.
- [x] **Optimistic Mutation Rollbacks**: Failed mutations always restore prior cache snapshot.
- [x] **Secure Token Storage**: Tokens encrypted via `expo-secure-store`.
