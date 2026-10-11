# AGENTS.md
## Operational Directives & Behavioral Governance for AI Agents
**Project: Rota – Mobile-First Shift Scheduling & Workforce Coordination Platform**

---

### Purpose of this Document
This file establishes non-negotiable operational rules, architectural boundaries, and behavioral standards for any AI agent operating within the Rota codebase. The [`PRD.md`](./docs/PRD.md) defines **WHAT** to build and **WHY**. This document defines **HOW** the agent must behave while writing, refactoring, or testing code.

Every constraint herein is a binding operational order. Violating any rule on the "Must Never Happen" list is an immediate disqualification and counts as a total failure of the engineering task.

---

### Question 1: What is this project?

1. **System Identity**: **Rota** is a multi-tenant, mobile-first shift scheduling platform tailored for small deskless teams (restaurants, clinics, retail stores).
2. **Target User Personas**:
   - `OWNER`: Manages team identity, subscription seats, billing, and member deactivations.
   - `MANAGER`: Builds schedules, publishes conflict-free rosters, reviews and approves/denies shift swaps.
   - `STAFF`: Frontline worker operating on Android mobile; views published rosters (online/offline), requests shift swaps, claims open shifts, and configures notification quiet hours.
3. **MVP Functional Scope**: The authoritative functional scope is strictly defined in [`PRD.md`](./docs/PRD.md) under requirements R1 through R6:
   - R1: Multi-tenant auth, session invalidation, and rotating tokens with 15-second grace window.
   - R2: Shift scheduling, overlap conflict detection, and swap state machine with atomic reassignments.
   - R3: Cursor-paginated activity feed ($O(1)$ index seek supporting 10,000+ seeded records).
   - R4: Seat-based billing, integer-cent proration engine, directional append-only ledger, and Flutterwave test mode.
   - R5: BullMQ background workers, timezone-aware midnight-spanning quiet hours, and 07:00 AM push digests.
   - R6: Encrypted local caching on mobile with mutation expiration guards.
4. **Source of Truth**: [`PRD.md`](./docs/PRD.md) is the single source of truth for all domain rules. When code and PRD conflict, update the code to match the PRD, not vice versa.

---

### Question 2: What is locked?

The core technology stack is frozen. You are strictly forbidden from substituting, upgrading, or introducing alternative technologies without explicit user instruction.

| Architectural Layer | Locked Technology | Prohibited Alternatives (Never Use) |
| :--- | :--- | :--- |
| **Mobile Client** | React Native with Expo (Managed Workflow, Expo SDK 51+, EAS Build for Android) | Bare React Native, Flutter, Ionic, Cordova |
| **Backend API** | Node.js (v20+ LTS) with TypeScript and Express.js | NestJS, Fastify, Koa, Hono, Go, Python |
| **Primary Database & ORM** | PostgreSQL 16 with Prisma ORM (`relationMode = "prisma"`) | TypeORM, Drizzle, Sequelize, Knex, raw SQL clients |
| **Cache, Locks & Queues** | Redis (Upstash-compatible) and BullMQ (v5+) | RabbitMQ, Kafka, AWS SQS, Agenda, BeeQueue |
| **Payment Gateway** | Flutterwave (Test Mode with simulated webhooks) | Stripe, Paystack, PayPal, Braintree |
| **Schema Validation** | Zod (v3+) on all HTTP and environment boundaries | Joi, Yup, Class-Validator, ajv |
| **Client Token Storage** | `expo-secure-store` | Unencrypted `AsyncStorage`, localStorage, cookies |
| **Date & Time Engine** | `date-fns` and `date-fns-tz` | Moment.js, Day.js, Luxon, raw Date math |

---

### Question 3: What must never happen? (Forbidden Actions)

Violating any rule in this section constitutes an **immediate failure** of the implementation.

1. **NEVER use floating-point numbers or decimals for money**:
   - ALL monetary values must be stored, computed, and transmitted as whole integer minor units (`amountCents: Int` or `kobo: Int`).
   - NEVER use `FLOAT`, `DOUBLE`, or `DECIMAL` types for monetary columns in Prisma or TypeScript.
   - ALL proration division must strictly use `Math.floor()` to round down to whole integer cents. Never round up or use floating fractional cents.
2. **NEVER trust client-side claims or computations**:
   - NEVER calculate proration, billable seat limits, shift conflicts, or permission checks on the mobile client.
   - NEVER accept client-provided `role`, `isOwner`, or `totalSeats` parameters. All authorization must be verified on the server against the database or Redis authorization cache.
3. **NEVER execute tenant-scoped queries without `teamId`**:
   - Every database query touching `Shift`, `ShiftSwapRequest`, `ActivityFeedItem`, `Subscription`, `SubscriptionLedger`, or `TeamMembership` MUST include `where: { teamId }`.
   - NEVER query records across tenant boundaries.
4. **NEVER store secrets or private keys in the mobile client**:
   - NEVER bundle `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, or `FLUTTERWAVE_SECRET_KEY` into the Expo app.
   - Mobile environment variables must strictly use `EXPO_PUBLIC_` and may only contain non-sensitive public URLs (e.g., `EXPO_PUBLIC_API_URL`).
5. **NEVER store authentication tokens in unencrypted mobile storage**:
   - ALWAYS store access and refresh tokens in `expo-secure-store`.
   - NEVER use unencrypted `@react-native-async-storage/async-storage` for tokens, passwords, or encryption keys.
6. **NEVER process push notifications or webhooks in the synchronous HTTP request cycle**:
   - Webhook endpoints must verify signatures, enqueue a BullMQ job, and return HTTP `200 OK` within 1.5 seconds.
   - Push notifications must ALWAYS be enqueued into BullMQ for asynchronous timezone evaluation and quiet-hours processing.
7. **NEVER use SQL `OFFSET` for activity feed pagination**:
   - Pagination MUST strictly use composite cursor keys `(created_at, id)` ordered `DESC` with index seeks.
8. **NEVER perform cross-database foreign key joins in the 2-DB sharding simulation**:
   - When routing to `prismaShard0` and `prismaShard1`, rely on application-level referential integrity (`relationMode = "prisma"`).
   - The Central Directory on `DB_SHARD_0` stores `User` and `TeamMembership`. Tenant-bound operational data is routed via `CRC32(teamId) % 2`.
9. **NEVER allow concurrent un-gated seat additions**:
   - Invariant: $\text{Consumed Seats} = \text{COUNT}(\text{Active Members}) + \text{COUNT}(\text{Pending Unexpired Invites})$.
   - ALWAYS acquire a distributed lock (`redlock:team_seats:{teamId}`) or row-level lock before confirming invitations or member acceptances.
10. **NEVER allow double-swaps on the same shift**:
    - A shift cannot be placed in a swap request if it is already referenced in any active swap with status `OPEN_FOR_CLAIM`, `PENDING_PEER_APPROVAL`, or `PENDING_MANAGER_APPROVAL`.
11. **NEVER issue negative cash refunds on mid-cycle downgrades**:
    - Mid-cycle downgrades never refund cash. Downgrades take effect strictly at `currentPeriodEnd`.
    - NEVER allow downgrades if current active members exceed target plan seat capacity (`ROSTER_EXCEEDS_TARGET_PLAN_CAP`).
12. **NEVER perform unsafe buffer comparisons for webhook verification**:
    - ALWAYS verify that `hashBuffer.length === secretBuffer.length` before calling `crypto.timingSafeEqual()`.

---

### Question 4: How is the work arranged? (Monorepo Directory Layout)

The codebase is organized as a structured monorepo. Every file must reside in its prescribed directory:

```
/
├── AGENTS.md                   # Core agent behavioral governance (workspace root)
├── app/                        # React Native / Expo Mobile Client
│   ├── assets/                 # Icons, splash images, fonts
│   ├── src/
│   │   ├── api/                # Axios/Fetch client, typed API hooks, token interceptors
│   │   ├── components/         # Reusable atomic UI components (Buttons, Modals, Inputs)
│   │   ├── context/            # AuthContext, TeamContext, NetworkContext
│   │   ├── hooks/              # Custom hooks (useOfflineShifts, useQuietHours)
│   │   ├── navigation/         # React Navigation stacks (AuthStack, AppTabs)
│   │   ├── screens/            # Screen views (AgendaScreen, SwapScreen, FeedScreen, SettingsScreen)
│   │   ├── storage/            # SecureStore wrappers and encrypted MMKV/SQLite stores
│   │   ├── types/              # Mobile TypeScript interfaces
│   │   └── utils/              # Client date formatters, optimistic mutation queues
│   ├── app.json                # Expo configuration
│   ├── package.json
│   └── tsconfig.json
│
├── server/                     # Express.js Backend & BullMQ Worker Runtime
│   ├── prisma/
│   │   ├── schema.prisma       # Canonical Prisma schema (relationMode = "prisma")
│   │   └── seed.ts             # 10,000+ record seeder for load & index testing
│   ├── src/
│   │   ├── config/             # Typed environment loader (Zod-validated)
│   │   ├── controllers/        # Route controllers (Auth, Shifts, Swaps, Billing, Feed)
│   │   ├── db/                 # ShardedPrismaManager (CRC32 router, Shard 0/1 clients)
│   │   ├── middleware/         # Auth, TenantContext, RateLimiter, Idempotency, ErrorHandler
│   │   ├── queues/             # BullMQ queue declarations & job producers
│   │   ├── routes/             # Express route declarations (/api/v1/...)
│   │   ├── services/           # ProrationEngine, ConflictDetector, WebhookVerifier
│   │   ├── types/              # Express augmentations, JWT payloads, domain types
│   │   ├── utils/              # Redis helpers, date-fns-tz helpers, logger
│   │   ├── workers/            # BullMQ worker consumers (NotificationWorker, WebhookWorker)
│   │   └── app.ts              # Express application setup and server entry point
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                       # Architectural Evidence & Documentation
│   ├── PRD.md                  # Authoritative Product Requirements Document
│   ├── ARCHITECTURE.md         # Detailed sharding, pooling, and sequence diagrams
│   └── API_SPEC.md             # Complete OpenAPI / REST contract specification
│
└── load-tests/                 # Performance Benchmarks & Stress Tests
    ├── k6-activity-feed.js     # k6 script verifying <20ms latency on 10k items
    ├── k6-shift-swaps.js       # k6 concurrency stress test on atomic shift reassignment
    └── mock-webhook-runner.ts  # CLI script generating signed Flutterwave payloads for CI
```

---

### Question 5: How should the code look?

1. **TypeScript Rigor**:
   - Strict mode is mandatory (`"strict": true` in all `tsconfig.json` files).
   - Explicit return types are REQUIRED on all exported functions, controller handlers, and service methods.
   - NEVER use the `any` type. If a type is unknown, use `unknown` and narrow it with Zod or TypeScript type guards.
2. **Schema-First Validation**:
   - Every incoming HTTP request body, query parameter, and route parameter must be validated with a Zod schema before hitting business logic.
   - Infer TypeScript types directly from Zod schemas: `type CreateShiftInput = z.infer<typeof CreateShiftSchema>`.
3. **Structured Error Handling**:
   - ALL Express route handlers must be wrapped in `try/catch` or an async handler middleware.
   - API error responses must strictly follow the uniform JSON error format:
     ```json
     {
       "success": false,
       "error": {
         "code": "STAFF_ALREADY_SCHEDULED",
         "message": "The selected staff member has an overlapping shift.",
         "details": null
       }
     }
     ```
   - HTTP status codes must be used accurately:
     - `400`: Malformed request or Zod validation error.
     - `401`: Missing, invalid, or expired authentication token.
     - `402`: Seat limit exceeded or subscription inactive.
     - `403`: Insufficient RBAC role permissions on team.
     - `404`: Entity not found within the authenticated tenant.
     - `409`: State conflict (shift overlap, concurrent swap, idempotency in-flight).
     - `422`: Semantic violation (e.g., downgrade with roster exceeding target cap).
     - `500`: Unhandled internal server exception.
4. **Code Cleanliness & Documentation**:
   - Self-documenting naming conventions: use explicit domain verbs (`detectShiftOverlap`, `calculateProratedSeatCharge`, `resolveQuietHoursWindow`).
   - Add inline comments strictly for non-obvious mathematical formulas, bitwise operations, or concurrency guards.
   - Zero dead code, unused imports, or leftover debugging `console.log` statements in committed files.
5. **Git Commit Standards**:
   - Conventional Commits standard is strictly enforced:
     - `feat:` for new capabilities.
     - `fix:` for bug fixes.
     - `chore:` for dependencies, config, or build scripts.
     - `refactor:` for code restructuring without behavior change.
     - `test:` for unit, integration, or load tests.
     - `docs:` for documentation updates.

---

### Question 6: What counts as done?

No feature or bug fix is complete until it satisfies all four criteria of the **Definition of Done**:

1. **Zero Type Errors & Passing Build**:
   - Backend: `npm run build` in `/server` exits with code 0 and zero TypeScript errors.
   - Mobile: `npx expo-doctor` and `npx tsc --noEmit` in `/app` report zero errors.
2. **Database Integrity**:
   - Prisma schema is valid: `npx prisma validate` passes.
   - Migrations are applied: `npx prisma migrate dev` or `npx prisma db push` executes cleanly across both shard targets.
3. **Automated or Manual Verification Evidence**:
   - For APIs: A curl script or integration test proves expected behavior and error responses.
   - For database performance: `EXPLAIN ANALYZE` confirms that `ActivityFeedItem` queries utilize the composite index `(team_id, created_at, id)` with index scans.
   - For billing: Unit tests confirm that proration edge cases (zero remaining time, 1-hour upgrades, leap cycles) match integer-cent formulas.
4. **Clean Execution**:
   - Zero unhandled promise rejections, zero deprecation warnings, and zero unhandled server exceptions in terminal logs.

---

### Question 7: What does the agent do when unsure?

1. **Zero Hallucination of Scope**:
   - The agent must NEVER invent new features, add unrequested third-party integrations, or assume unstated business logic.
2. **Ambiguity Protocol**:
   - If a requirement in [`PRD.md`](./PRD.md) appears ambiguous or conflicts with an existing codebase pattern:
     1. **STOP IMMEDIATELY**. Do not write speculative code.
     2. Identify the exact conflict, line number, and competing architectural options.
     3. Present the dilemma concisely to the user and request explicit guidance before proceeding.
3. **Failure Escalation**:
   - If a locked dependency (e.g., Prisma, Expo, BullMQ) encounters an upstream breaking bug or incompatible peer dependency, report the failure immediately with the raw stack trace. NEVER silently replace the locked library.
