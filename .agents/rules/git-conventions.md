---
trigger: glob
---

# Rule: Git Commit Conventions & Repository Hygiene
**Scope**: Workspace Root, Git History, PR Descriptions, and Automation  
**Authority**: Mandatory Governance (Enforced in Antigravity)

---

## 1. Core Principle
A clear, deterministic, and audit-ready Git history is required for automated release notes, rollback safety, and cross-agent traceability. Cryptographic keys and environment secrets must never enter the repository under any circumstances.

---

## 2. Conventional Commit Standards

All commit messages must strictly adhere to the Conventional Commits specification:

```
<type>(<scope>): <short summary in imperative mood>

[optional body explaining rationale and non-obvious details]

[optional footer(s), e.g., Refs: #123]
```

### Allowed Types:
- `feat`: A new user-facing feature or API capability (e.g., `feat(shift): implement conflict detection engine`).
- `fix`: A bug fix or remediation of unintended behavior (e.g., `fix(auth): handle 15-second grace window token refresh`).
- `chore`: Dependency updates, build configurations, toolings, or lint fixes (e.g., `chore(deps): update expo sdk to 51`).
- `refactor`: Code restructuring that neither fixes a bug nor adds a feature (e.g., `refactor(db): extract sharded prisma router`).
- `test`: Adding or refactoring unit, integration, or load test scripts (e.g., `test(billing): add proration edge case unit tests`).
- `docs`: Documentation updates, architecture diagrams, or rule definitions (e.g., `docs(api): document openapi swap endpoints`).

### Allowed Scopes:
- `api` / `server`: Backend Express logic, routes, and controllers.
- `mobile` / `app`: React Native / Expo mobile client.
- `db` / `prisma`: Database schemas, migrations, or seed scripts.
- `billing`: Proration engine, ledger, or Flutterwave integration.
- `queue`: BullMQ worker processors and background jobs.
- `security`: Auth, RBAC, encryption, or rate limiting.
- `design`: UI tokens, typography, and theme styling.

---

## 3. Commit Message Rules & Grammar

1. **Imperative, Lowercase Subject Line**:
   - Use imperative present tense: `"add feature"` (NOT `"added feature"` or `"adds feature"`).
   - Do NOT capitalize the first letter of the subject line.
   - Do NOT place a period (`.`) at the end of the subject line.
   - Subject line must not exceed 72 characters.

2. **Atomic Commits**:
   - Each commit must encapsulate a single logical change.
   - Never combine unrelated features, formatting renames, and bug fixes into a monolithic commit.

---

## 4. Absolute Ban on Secret Commitments

1. **No Sensitive Artifacts**:
   - The following files and contents must NEVER be staged or committed:
     - `.env`, `.env.local`, `.env.production`
     - Private keys (`*.pem`, `*.key`)
     - Keystores (`*.jks`, `*.keystore`)
     - Database credentials, `JWT_SECRET`, `FLUTTERWAVE_SECRET_KEY`
   - Any commit introducing a live secret immediately triggers security disqualification.

2. **Repository Hygiene**:
   - Generated files, build caches (`dist/`, `build/`, `.expo/`), and OS noise (`.DS_Store`, `Thumbs.db`) must be excluded via `.gitignore`.
