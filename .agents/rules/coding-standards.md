# Rule: Coding Standards & TypeScript Rigor
**Scope**: Server (`/server`), Mobile Client (`/app`), Shared Types, and Test Harnesses  
**Authority**: Mandatory Governance (Enforced in Antigravity)

---

## 1. Core Principle
Rota operates in healthcare, hospitality, and retail environments where scheduling errors cause regulatory non-compliance, understaffed clinics, and payroll disputes. Code that merely "compiles and runs" is unacceptable if it compromises type safety, omits runtime boundary checks, or allows untyped data propagation.

---

## 2. TypeScript Rigor & Compiler Invariants

1. **Strict Type Checking**:
   - `"strict": true` must be enabled in all `tsconfig.json` files (`server/tsconfig.json`, `app/tsconfig.json`).
   - `noImplicitAny: true`, `strictNullChecks: true`, and `strictFunctionTypes: true` are non-negotiable.

2. **Absolute Ban on `any`**:
   - The `any` keyword is strictly prohibited in all application and test code.
   - If incoming data is unknown (external API responses, raw JSON, parsed parameters), it MUST be typed as `unknown` and narrowed using Zod schemas or TypeScript custom type guards (`value is T`).
   - Casting via `as any` or `<any>` constitutes an immediate failure.

3. **Explicit Function & Method Return Types**:
   - ALL exported functions, Express route handlers, middleware functions, and service methods MUST have explicit, annotated return types.
   - Example (Required):
     ```typescript
     export async function findConflictingShifts(
       teamId: string,
       userId: string,
       startTime: Date,
       endTime: Date
     ): Promise<Shift[]> { ... }
     ```
   - Do NOT rely on TypeScript compiler inference for public/exported module boundaries.

---

## 3. Boundary Validation (Schema-First Architecture)

1. **Mandatory Zod Validation on All Ingress Boundaries**:
   - Every incoming HTTP request body (`req.body`), route parameter (`req.params`), and query parameter (`req.query`) must be parsed and validated by a Zod schema before invoking business logic.
   - Environment variables loaded in `/server/src/config/` must be validated with Zod at process initialization. If any required variable is missing or malformed, the process must terminate immediately with exit code 1.

2. **Type Inference from Zod**:
   - DTOs and request types must be inferred directly from Zod schemas to eliminate duplicate type drift:
     ```typescript
     export const CreateShiftInputSchema = z.object({
       userId: z.string().uuid().optional(),
       startTime: z.string().datetime(),
       endTime: z.string().datetime(),
       roleTitle: z.string().min(1).max(50),
       notes: z.string().max(1000).optional(),
       status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT')
     });

     export type CreateShiftInput = z.infer<typeof CreateShiftInputSchema>;
     ```

---

## 4. Uniform Error Responses & HTTP Semantics

1. **Standardized API Response Contract**:
   - All server responses must conform strictly to the uniform JSON envelope:
     ```typescript
     // Success Envelope
     {
       "success": true,
       "data": T
     }

     // Error Envelope
     {
       "success": false,
       "error": {
         "code": string,        // Machine-readable screaming snake case (e.g., 'STAFF_ALREADY_SCHEDULED')
         "message": string,     // Human-readable message
         "details": unknown     // Validation errors array, or null
       }
     }
     ```

2. **Strict HTTP Status Code Mapping**:
   - `400 Bad Request`: Schema validation failure (Zod error), malformed JSON payload.
   - `401 Unauthorized`: Missing, expired, invalid JWT, or revoked refresh token.
   - `402 Payment Required`: Seat limit reached, subscription unpaid or past due.
   - `403 Forbidden`: Authenticated user lacks RBAC role permissions for the team resource.
   - `404 Not Found`: Resource does not exist within the authenticated tenant's scope.
   - `409 Conflict`: Business state conflict (shift overlap, double swap request, lock contention).
   - `422 Unprocessable Entity`: Semantic violation (e.g., scheduling a downgrade when active roster exceeds target cap).
   - `500 Internal Server Error`: Unhandled infrastructure failure (DB connection drop, unhandled promise).

3. **Global Async Handler**:
   - All Express controllers must be wrapped with an async error handling wrapper or utilize Express 5 native async error routing. Raw uncaught promise rejections are forbidden.

---

## 5. Temporal Arithmetic & Date Invariants

1. **Locked Date Libraries**:
   - Only `date-fns` and `date-fns-tz` are permitted.
   - `moment.js`, `dayjs`, `luxon`, or raw JavaScript `Date` arithmetic (`Date.now() + 86400000`, `getTime()` manipulations) are strictly prohibited for business logic.

2. **UTC Storage & ISO-8601 Strings**:
   - All dates in PostgreSQL must be stored as UTC `timestamptz(6)`.
   - Mobile and server API contracts must exchange timestamps strictly as ISO-8601 UTC strings (`2026-10-10T14:00:00.000Z`).
   - Timezone formatting must always explicitly accept an IANA timezone identifier (e.g., `"America/New_York"` or `"Africa/Lagos"`).

---

## 6. Code Hygiene & Verification Invariants

1. **No Leftover Debugging Code**:
   - No `console.log`, `debugger`, or commented-out code blocks may be committed. Use the structured logger (`server/src/utils/logger.ts`).
2. **Zero Dead Code & Clean Imports**:
   - Unused imports, unused variables, and orphaned test utilities must be pruned.
3. **Definition of Done**:
   - Backend: `npm run build` exits 0 with zero TypeScript diagnostic errors.
   - Mobile: `npx tsc --noEmit` exits 0 with zero errors.
