# API_SPEC.md
## Complete REST API Contract Specification
**Project: Rota – Mobile-First Shift Scheduling & Workforce Coordination Platform**  
**Version**: 1.0.0 (API v1)  
**Base URL**: `/api/v1`

---

## 1. Global Conventions & Protocols

### 1.1 Headers & Content Type
- `Content-Type: application/json`
- `Authorization: Bearer <access_token>` (Required on all authenticated routes)
- `Idempotency-Key: <uuid>` (Mandatory on state-mutating requests: payments, member additions, swap reviews)

### 1.2 Uniform JSON Envelope

#### Success Response (HTTP 200 / 201)
```json
{
  "success": true,
  "data": {}
}
```

#### Error Response (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "STAFF_ALREADY_SCHEDULED",
    "message": "The selected staff member has an overlapping shift during this timeframe.",
    "details": null
  }
}
```

### 1.3 Standard HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Schema validation failure (Zod error), malformed parameters.
- `401 Unauthorized`: Missing, expired, or invalid token; revoked token family reuse.
- `402 Payment Required`: Seat limit reached, subscription inactive or unpaid.
- `403 Forbidden`: Authenticated user lacks RBAC permissions for resource.
- `404 Not Found`: Resource does not exist in target tenant scope.
- `409 Conflict`: Business state conflict (shift overlap, concurrent double-swap, in-flight lock).
- `422 Unprocessable Entity`: Semantic violation (e.g., active roster exceeds target plan cap).
- `429 Too Many Requests`: Rate limit exceeded (Redis sliding window counter).
- `500 Internal Server Error`: Unhandled server exception.

---

## 2. Authentication & Identity (`/api/v1/auth`)

### 2.1 Register & Provision Team
- **Route**: `POST /api/v1/auth/register`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "elena@bistro.com",
    "password": "SecurePassword123!",
    "fullName": "Elena Rostova",
    "teamName": "Elena's Bistro",
    "timezone": "America/New_York"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "elena@bistro.com", "fullName": "Elena Rostova" },
      "team": { "id": "uuid", "name": "Elena's Bistro", "role": "OWNER" },
      "accessToken": "jwt_string",
      "refreshToken": "hex_string_64"
    }
  }
  ```

### 2.2 Login
- **Route**: `POST /api/v1/auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "elena@bistro.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**: Returns user profile, list of teams with roles, and tokens.

### 2.3 Refresh Tokens (15-Second Grace Window)
- **Route**: `POST /api/v1/auth/refresh`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "refreshToken": "hex_string_64"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "new_jwt_string",
      "refreshToken": "new_hex_string_64"
    }
  }
  ```
- **Error `401 Unauthorized`** (`TOKEN_REUSE_DETECTED`): If a previously rotated token is replayed outside the 15-second grace window, the entire token family is revoked.

### 2.4 Global Session Invalidation
- **Route**: `POST /api/v1/auth/revoke-all`
- **Auth**: Authenticated
- **Response `200 OK`**: Increments `User.tokenVersion` in PostgreSQL and purges Redis sessions.

---

## 3. Team Management & Membership (`/api/v1/teams`)

### 3.1 Send Member Invitation
- **Route**: `POST /api/v1/teams/:teamId/invitations`
- **Auth**: `OWNER` or `MANAGER`
- **Request Body**:
  ```json
  {
    "email": "priya@bistro.com",
    "role": "STAFF"
  }
  ```
- **Response `201 Created`**: Returns invitation token and expiration (72h).
- **Error `402 Payment Required`** (`SEAT_LIMIT_REACHED`): Triggered if active members + pending unexpired invites $\ge$ `totalSeats`.

### 3.2 Join Team via Invitation
- **Route**: `POST /api/v1/teams/join`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "token": "hmac_invitation_token",
    "fullName": "Priya Sharma",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**: Provisions user, binds `TeamMembership`, marks invitation accepted under lock.

---

## 4. Shift Scheduling (`/api/v1/teams/:teamId/shifts`)

### 4.1 Create Shift
- **Route**: `POST /api/v1/teams/:teamId/shifts`
- **Auth**: `OWNER` or `MANAGER`
- **Request Body**:
  ```json
  {
    "assignedToId": "uuid_optional",
    "roleTitle": "Lead Barista",
    "startTime": "2026-10-12T08:00:00.000Z",
    "endTime": "2026-10-12T16:00:00.000Z",
    "notes": "Opening duties",
    "status": "DRAFT"
  }
  ```
- **Response `201 Created`**
- **Error `409 Conflict`** (`STAFF_ALREADY_SCHEDULED`): If `assignedToId` has an overlapping shift:
  $$(\text{start}_{\text{new}} < \text{end}_{\text{existing}}) \land (\text{end}_{\text{new}} > \text{start}_{\text{existing}})$$

### 4.2 Publish Shifts
- **Route**: `POST /api/v1/teams/:teamId/shifts/publish`
- **Auth**: `OWNER` or `MANAGER`
- **Request Body**:
  ```json
  {
    "shiftIds": ["uuid_1", "uuid_2"]
  }
  ```
- **Response `200 OK`**: Atomically updates `status = PUBLISHED` and queues BullMQ notification batch.

### 4.3 List Shifts (Date Range Filter)
- **Route**: `GET /api/v1/teams/:teamId/shifts?startDate=...&endDate=...`
- **Auth**: Authenticated (Staff only see `PUBLISHED` shifts).

---

## 5. Shift Swap Lifecycle (`/api/v1/teams/:teamId/swaps`)

### 5.1 Request Shift Swap
- **Route**: `POST /api/v1/teams/:teamId/swaps`
- **Auth**: Authenticated (Must own `sourceShiftId`)
- **Request Body**:
  ```json
  {
    "sourceShiftId": "uuid_shift_1",
    "targetUserId": "uuid_user_2_optional",
    "targetShiftId": "uuid_shift_2_optional"
  }
  ```
- **Status Assigned**:
  - `targetUserId` null $\longrightarrow$ `OPEN_FOR_CLAIM`
  - `targetUserId` provided $\longrightarrow$ `PENDING_PEER_APPROVAL`
- **Error `409 Conflict`** (`SHIFT_ALREADY_IN_ACTIVE_SWAP`): Enforces Single Active Swap Invariant.

### 5.2 Claim Open Pool Shift
- **Route**: `POST /api/v1/teams/:teamId/swaps/:swapId/claim`
- **Auth**: Authenticated (`STAFF`)
- **Response `200 OK`**: Transitions status to `PENDING_MANAGER_APPROVAL`.

### 5.3 Peer Review (Accept / Decline)
- **Route**: `POST /api/v1/teams/:teamId/swaps/:swapId/peer-action`
- **Auth**: Authenticated (Target user only)
- **Request Body**:
  ```json
  { "action": "ACCEPT" }
  ```
- **Response `200 OK`**: Transitions to `PENDING_MANAGER_APPROVAL` (or `REJECTED`).

### 5.4 Manager Review (Approve / Deny)
- **Route**: `POST /api/v1/teams/:teamId/swaps/:swapId/review`
- **Auth**: `OWNER` or `MANAGER`
- **Request Body**:
  ```json
  {
    "action": "APPROVE",
    "reason": "Approved by Marcus"
  }
  ```
- **Atomic Execution on Approval**:
  1. Validates shifts have not started and are `PUBLISHED`.
  2. Atomically exchanges `assignedToId` on both shifts.
  3. Updates swap status to `APPROVED`.
  4. Appends audit records to Activity Feed.
  5. Enqueues BullMQ push notifications for both staff members.

---

## 6. Activity Feed (`/api/v1/teams/:teamId/feed`)

### 6.1 Cursor-Paginated Activity Feed
- **Route**: `GET /api/v1/teams/:teamId/feed`
- **Auth**: Authenticated
- **Query Parameters**:
  - `cursor`: Base64-encoded `{ createdAt, id }` (optional)
  - `limit`: Integer (1-100, default 25)
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "uuid",
          "action": "SHIFT_PUBLISHED",
          "actorId": "uuid",
          "entityId": "uuid",
          "entityType": "Shift",
          "metadata": {},
          "createdAt": "2026-10-12T10:00:00.000Z"
        }
      ],
      "nextCursor": "base64_encoded_string_or_null",
      "hasMore": true
    }
  }
  ```

---

## 7. Billing & Subscriptions (`/api/v1/teams/:teamId/billing`)

### 7.1 View Subscription & Balance
- **Route**: `GET /api/v1/teams/:teamId/billing/subscription`
- **Auth**: `OWNER` only
- **Response `200 OK`**: Returns current plan, total seats, consumed seats, and billing dates.

### 7.2 Purchase Extra Seats (Prorated)
- **Route**: `POST /api/v1/teams/:teamId/billing/seats`
- **Auth**: `OWNER` only
- **Request Body**:
  ```json
  {
    "additionalSeats": 3,
    "paymentToken": "flw_token_optional"
  }
  ```
- **Response `200 OK`**: Returns prorated charge in integer cents and updated `totalSeats`.

### 7.3 Upgrade Plan (Prorated)
- **Route**: `POST /api/v1/teams/:teamId/billing/upgrade`
- **Auth**: `OWNER` only
- **Request Body**:
  ```json
  {
    "targetPlan": "TEAM"
  }
  ```
- **Response `200 OK`**: Calculates unused credit, charges prorated difference in minor units, updates plan.

### 7.4 Schedule Downgrade
- **Route**: `POST /api/v1/teams/:teamId/billing/downgrade`
- **Auth**: `OWNER` only
- **Request Body**:
  ```json
  {
    "targetPlan": "STARTER"
  }
  ```
- **Error `422 Unprocessable Entity`** (`ROSTER_EXCEEDS_TARGET_PLAN_CAP`): Returned if active member count exceeds target plan maximum capacity.

### 7.5 Flutterwave Webhook Ingress
- **Route**: `POST /api/v1/billing/webhooks`
- **Auth**: Header `verif-hash` verified via `crypto.timingSafeEqual()`
- **Response `200 OK`**: Enqueues BullMQ billing job and returns within 1.5 seconds.
