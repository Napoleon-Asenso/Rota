# Rule: Security, Authentication & Threat Mitigation
**Scope**: Authentication, RBAC, Token Lifecycle, Encryption, and Network Ingress  
**Authority**: Mandatory Governance (Enforced in Antigravity)

---

## 1. Core Principle
Rota manages sensitive operational and staff schedule data. Client devices and public network links are treated as untrusted. Authorization must be verified exclusively on the server, tokens must be rotated with replay detection, and mobile secrets must reside in encrypted hardware keystores.

---

## 2. Server-Side RBAC & Authorization Invariants

1. **Zero Trust for Client Claims**:
   - The server must NEVER accept client-supplied `role`, `isOwner`, `permissions`, or `totalSeats` flags.
   - All authorization checks are computed server-side via `tenantContextMiddleware` against the database or Redis authorization cache.

2. **Role Hierarchy**:
   - `OWNER`: Full administrative, team policy, and billing authority.
   - `MANAGER`: Roster creation, shift publishing, and swap approvals. Zero access to billing or subscription endpoints.
   - `STAFF`: Self-shift viewing, swap initiating/claiming, and profile management. Cannot view drafts or edit other staff records.

3. **Authorization Caching & Synchronous Invalidation**:
   - Team memberships and roles are cached in Redis: `team:{teamId}:user:{userId}:role` (TTL: 60 seconds).
   - Any membership update, role change, or deactivation must SYNCHRONOUSLY delete this Redis key and increment `User.tokenVersion` in PostgreSQL.

---

## 3. Token Lifecycle & Rotation with 15-Second Grace Window

1. **Access Tokens**:
   - Signed with HMAC-SHA256 (`JWT_SECRET`).
   - Lifespan: Strictly 15 minutes.
   - Claims: `{ sub: userId, teamId: currentTeamId, role: currentRole, tokenVersion: Int, jti: uuid }`.
   - Middleware must verify that JWT `tokenVersion` matches `User.tokenVersion`.

2. **Refresh Tokens**:
   - 64-byte cryptographically secure random string.
   - Stored in the database hashed via SHA-256 (`tokenHash`).
   - Tracked with `familyId`, `isRevoked`, and 30-day absolute expiration.

3. **Rotation & 15-Second Grace Protocol**:
   - When token $R_1$ is exchanged for $R_2$:
     - Mark $R_1$ as revoked in database.
     - Issue child token $R_2$ within same `familyId`.
     - Register grace window in Redis: `SET token:grace:{hash(R1)} {hash(R2)} EX 15`.
   - **Legitimate Race Handling**: If $R_1$ is presented within 15 seconds (e.g., mobile retry after packet drop), return $R_2$ without minting a third token or invalidating the family.
   - **Reuse Attack Detection**: If $R_1$ is presented *outside* the 15-second grace window:
     - Mark all tokens with `familyId` as revoked (`isRevoked: true`).
     - Delete all active user sessions in Redis (`session:{userId}*`).
     - Terminate the request with HTTP `401 Unauthorized` (`TOKEN_REUSE_DETECTED`).

4. **Global Session Invalidation**:
   - Endpoint `POST /api/v1/auth/revoke-all` must increment `User.tokenVersion` and purge all Redis session keys.

---

## 4. Mobile Token Storage & Client Secrets

1. **Hardware-Backed Storage Only**:
   - Mobile client MUST store access and refresh tokens exclusively in `expo-secure-store`.
   - Storing tokens or sensitive data in unencrypted `@react-native-async-storage/async-storage`, `localStorage`, or cookies is strictly forbidden.

2. **No Bundled Secrets**:
   - Mobile bundles must NEVER include `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, or `FLUTTERWAVE_SECRET_KEY`.
   - Only public variables prefixed with `EXPO_PUBLIC_` (e.g., `EXPO_PUBLIC_API_URL`) are permissible in mobile client code.

---

## 5. Network Ingress Defense, Rate Limiting & Webhook Verification

1. **Redis Sliding-Window Rate Limiter**:
   - Ingress endpoints must enforce sliding-window rate limits via Redis:
     - General endpoints: Max 100 requests / minute / IP or User.
     - Auth & Billing endpoints: Max 10 requests / minute / IP or User.
   - Exceeding limits triggers HTTP `429 Too Many Requests` (`RATE_LIMIT_EXCEEDED`).

2. **Length-Safe Webhook Signature Verification**:
   - Webhook signatures from Flutterwave must be verified before processing payload.
   - Direct string comparisons are forbidden to prevent timing attacks.
   - Buffer length MUST be verified prior to calling `crypto.timingSafeEqual()`:
     ```typescript
     const hashBuffer = Buffer.from(receivedHash);
     const secretBuffer = Buffer.from(expectedHash);

     if (hashBuffer.length !== secretBuffer.length || !crypto.timingSafeEqual(hashBuffer, secretBuffer)) {
       return res.status(401).json({ error: "INVALID_SIGNATURE" });
     }
     ```

3. **Idempotency Locks**:
   - State-mutating routes must acquire Redis atomic lock `lock:idempotency:{teamId}:{key} EX 30 NX` to eliminate concurrent double-submits.
