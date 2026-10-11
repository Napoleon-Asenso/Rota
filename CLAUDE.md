# CLAUDE.md
## Quick Reference & Agent Instructions for Rota

**Rota** is a multi-tenant, mobile-first shift scheduling platform built for small deskless teams (independent restaurants, clinics, retail stores).

---

### 1. Monorepo Structure & Key Commands

```
/
├── AGENTS.md                  # Core operational governance & non-negotiables
├── CLAUDE.md                  # This high-leverage agent cheat sheet
├── matisse-tokens-all.json    # Locked design tokens (colors, spacing, typography)
├── .agents/
│   ├── rules/                 # Binding domain rules (coding, db, billing, queues, etc.)
│   └── skills/                # Procedural runbooks for core technical workflows
├── app/                       # React Native / Expo Mobile Client (Android EAS)
├── server/                    # Express.js REST API & BullMQ Background Runtime
├── docs/                      # Architectural specs (PRD.md, ARCHITECTURE.md, API_SPEC.md)
└── load-tests/                # k6 load tests and mock webhook runner
```

#### Common Commands

| Task | Location | Command |
| :--- | :--- | :--- |
| **Backend Dev Server** | `/server` | `npm run dev` |
| **Backend Build** | `/server` | `npm run build` |
| **Prisma Validate** | `/server` | `npx prisma validate` |
| **Apply Dual-Shard DB Push** | `/server` | `npm run db:push:shards` |
| **Run Seed (10k Feed Items)** | `/server` | `npx ts-node prisma/seed.ts` |
| **Mock Webhook CLI** | `/server` | `npm run test:webhook` |
| **Mobile Dev Server** | `/app` | `npx expo start` |
| **Mobile Type Check** | `/app` | `npx tsc --noEmit` |
| **Mobile Expo Doctor** | `/app` | `npx expo-doctor` |
| **k6 Feed Stress Test** | `/load-tests` | `k6 run k6-activity-feed.js` |

---

### 2. Locked Architecture & Tech Stack

- **Mobile Client**: React Native with Expo (SDK 51+, Managed Workflow, EAS Android).
- **Backend**: Node.js (v20+ LTS), TypeScript, Express.js.
- **Database & ORM**: PostgreSQL 16, Prisma (`relationMode = "prisma"`).
- **Sharding Topology**: Central Directory (`DB_SHARD_0`) for identity; Tenant operational data sharded across `DB_SHARD_0` and `DB_SHARD_1` via `CRC32(teamId) >>> 0 % 2`.
- **Cache, Locks & Queues**: Upstash-compatible Redis, BullMQ (v5+), Redlock.
- **Payments**: Flutterwave (Test Mode with webhook HMAC verification).
- **Dates**: `date-fns` & `date-fns-tz` strictly. All database timestamps stored in UTC `timestamptz(6)`.
- **Validation**: Zod (v3+) on all HTTP request bodies, params, queries, and environment variables.

---

### 3. Absolute Non-Negotiables (Zero Tolerance Rules)

1. **Integer Money Only**: Money is ALWAYS whole integer minor units (`amountCents: Int` or `kobo: Int`). Floats/decimals are strictly banned.
2. **Always Scope by `teamId`**: Every single database query touching tenant data MUST include `where: { teamId }`.
3. **No SQL `OFFSET`**: Activity Feed queries must strictly use composite index seeks `(created_at DESC, id DESC)`.
4. **Token Security**: Tokens are stored strictly in `expo-secure-store` on mobile. Refresh token rotation enforces a 15-second grace window (`token:grace:{hash(R1)}`); reuse outside grace window revokes the entire token family.
5. **No Synchronous Push/Webhooks**: Push notifications and webhooks must run asynchronously in BullMQ. Return HTTP `200 OK` within 1.5 seconds.
6. **Timezone Quiet Hours**: Off-hours notifications (`NORMAL` priority) are suppressed and consolidated into a morning digest scheduled for `quietHoursEnd`. Critical alerts (`< 2h` shift cancellation) bypass quiet hours.
7. **Design Token Adherence**: No arbitrary inline colors or margins. Reference `matisse-tokens-all.json`. Minimum touch target is 44x44pt.

---

### 4. Context References

- **Requirements & Edge Cases**: [`docs/PRD.md`](./docs/PRD.md)
- **Detailed Architecture & Diagrams**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Complete REST API Contract**: [`docs/API_SPEC.md`](./docs/API_SPEC.md)
- **Frontend Guidelines**: [`docs/FRONTEND_GUIDE.md`](./docs/FRONTEND_GUIDE.md)
- **Backend Guidelines**: [`docs/BACKEND_GUIDE.md`](./docs/BACKEND_GUIDE.md)
- **Rules Directory**: [`.agents/rules/`](./.agents/rules/)
- **Skills Runbooks**: [`.agents/skills/`](./.agents/skills/)
