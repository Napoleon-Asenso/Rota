---
trigger: glob
---

# Rule: Financial Accuracy, Proration & Billing Ledger
**Scope**: Subscription Engine (`/server/src/services/proration*`), Ledger Models, and Payment Integrations  
**Authority**: Mandatory Governance (Enforced in Antigravity)

---

## 1. Core Principle
Financial calculations demand zero-defect precision. Rounding errors, floating-point drift, and unverified client seat adjustments create accounting liabilities. All money is stored as integer minor units, proration is calculated server-side rounding down, and transactions are immutably audited in an append-only ledger.

---

## 2. Integer Minor Units Mandate (No Decimals / Floats)

1. **Storage & Typing**:
   - ALL monetary values must be represented as whole integer minor units (`amountCents: Int` or `kobo: Int`).
   - Using `FLOAT`, `DOUBLE`, `DECIMAL`, or fractional numbers in Prisma schema, TypeScript interfaces, or API contracts is an immediate disqualification.
   - Example (Violation): `price: 19.99` or `price: 20.0` -> **FAIL**.
   - Example (Required): `priceCents: 1999` or `basePriceCents: 2000` -> **PASS**.

2. **Currency Conventions**:
   - Denominated in USD cents or NGN kobo.
   - Never perform dynamic foreign exchange conversion in the MVP codebase.

---

## 3. Server-Side Proration Engine & Mathematical Formulas

1. **Strict Server-Side Computation**:
   - Proration calculations must NEVER be performed or accepted from the mobile client.

2. **Seat Addition Proration Formula**:
   - Given:
     - $N_{\text{new}}$: Number of additional seats purchased.
     - $U$: Unit seat price per cycle in cents ($300$ for Team, $200$ for Business).
     - $D_{\text{total}} = T_{\text{end}} - T_{\text{start}}$ (seconds in billing cycle).
     - $D_{\text{remaining}} = T_{\text{end}} - T_{\text{now}}$ (seconds remaining).
   - Formula:
     $$\text{Prorated Charge (cents)} = \left\lfloor \frac{N_{\text{new}} \times U \times D_{\text{remaining}}}{D_{\text{total}}} \right\rfloor$$
   - Division MUST strictly use `Math.floor()`. Never round up (`Math.ceil`) or round to nearest (`Math.round`).

3. **Plan Upgrade Proration Formula** (e.g., Starter to Team):
   - Unused credit of current plan:
     $$\text{Unused Credit} = \left\lfloor \frac{\text{BasePrice}_{\text{old}} \times D_{\text{remaining}}}{D_{\text{total}}} \right\rfloor$$
   - Cost of new plan for remaining duration:
     $$\text{New Plan Cost} = \left\lfloor \frac{\text{BasePrice}_{\text{new}} \times D_{\text{remaining}}}{D_{\text{total}}} \right\rfloor$$
   - Immediate charge due:
     $$\text{Immediate Due (cents)} = \max(0, \text{New Plan Cost} - \text{Unused Credit})$$

4. **Edge Cases**:
   - When $D_{\text{remaining}} \le 0$, charge is strictly `0`.
   - Leap cycles and variable month lengths must be computed using exact second differences via `date-fns`.

---

## 4. Seat Concurrency Governance & Billable Seat Invariant

1. **The Invariant**:
   $$\text{Consumed Seats} = \text{COUNT}(\text{TeamMembership WHERE isActive = true}) + \text{COUNT}(\text{TeamInvitation WHERE acceptedAt IS NULL AND expiresAt} > \text{NOW}())$$

2. **Concurrency Locking**:
   - Adding a member or dispatching an invitation must acquire either:
     - Redis distributed lock: `redlock:team_seats:{teamId}`.
     - Row-level lock: `SELECT total_seats FROM subscriptions WHERE team_id = $1 FOR UPDATE;`.
   - If $\text{Consumed Seats} \ge \text{Subscription.totalSeats}$, abort immediately with HTTP `402 Payment Required` (`SEAT_LIMIT_REACHED`).

---

## 5. Downgrade Invariants & Zero Cash Refund Policy

1. **Zero Negative Cash Refunds**:
   - Mid-cycle downgrades or seat reductions NEVER issue cash refunds.
   - Downgrades take effect strictly at `currentPeriodEnd`.

2. **Roster Capacity Pre-Check**:
   - Before scheduling a downgrade, the system must check active member count against target plan seat capacity:
     ```typescript
     if (activeMemberCount > targetPlanMaxSeats) {
       throw new BusinessRuleException(
         "ROSTER_EXCEEDS_TARGET_PLAN_CAP",
         "Active roster exceeds target plan seat capacity. Deactivate staff before downgrading.",
         422
       );
     }
     ```

---

## 6. Directional Append-Only Financial Ledger

1. **Immutable Records**:
   - Table `subscription_ledgers` is append-only. Rows must NEVER be updated or deleted.
   - Fields: `direction` (`DEBIT` | `CREDIT`), `entryType` (`BASE_FEE`, `SEAT_ADDITION_PRORATED`, `PLAN_UPGRADE_PRORATED`, `MONTHLY_RENEWAL`, `REFUND`, `CREDIT_ADJUSTMENT`), `amountCents: Int`, `balanceAfterCents: Int`.

2. **Payment Gateway Settlement**:
   - Upgrades and extra seats require synchronous authorization with Flutterwave before updating `Subscription.totalSeats` or `Subscription.plan` in PostgreSQL.
   - Flutterwave webhook payloads must supply `tx_ref` mapped to `idempotency_key` on the ledger entry to prevent duplicate debits.
