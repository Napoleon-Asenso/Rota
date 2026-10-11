---
trigger: glob
---

# Rule: Matisse Design System & Mobile UI Tokens
**Scope**: Mobile Client (`/app`), Atomic Components (`/app/src/components`), Screen Views (`/app/src/screens`), and Theming  
**Authority**: Mandatory Governance (Enforced in Antigravity)

---

## 1. Core Principle
UI fragmentation and arbitrary styling violate Rota's product standards. All visual styling, measurements, and color palettes must strictly derive from the single source of truth: [`matisse-tokens-all.json`](file:///c:/Dev/Rota/matisse-tokens-all.json).

---

## 2. Absolute Ban on Hardcoded Literals

1. **Colors**:
   - Zero hardcoded color literals: NEVER write hex (`#1E293B`, `#FFF`), RGB (`rgb(...)`), or raw HSL values in components or stylesheets.
   - All colors must reference theme tokens from `matisse-tokens-all.json`:
     - Light/Dark mode variants: `primary-color`, `on-primary-color`, `primary-container-color`, `secondary-color`, `tertiary-color`, `error-color`, `background-color`, `surface-color`, `surface-variant-color`, `outline-color`, `surface-container-color`, etc.
   - Example (Violation): `backgroundColor: '#2563EB'` -> **FAIL**.
   - Example (Required): `backgroundColor: theme.color.primary` or `tokens.color.light['primary-color']` -> **PASS**.

2. **Spacing**:
   - Zero arbitrary numerical margins or paddings (e.g., `margin: 13`, `padding: 7`, `gap: 15`).
   - Every layout offset must map directly to tokens in `spacing`:
     - `spacing-0` (0)
     - `spacing-0.5` (2px / 0.125rem)
     - `spacing-1` (4px / 0.25rem)
     - `spacing-1.5` (6px / 0.375rem)
     - `spacing-2` (8px / 0.5rem)
     - `spacing-2.5` (10px / 0.625rem)
     - `spacing-3` (12px / 0.75rem)
     - `spacing-3.5` (14px / 0.875rem)
     - `spacing-4` (16px / 1rem)
     - Up to `spacing-96` (384px / 24rem).

3. **Typography**:
   - Font family must strictly be `Inter` (`font-family-sans`, `font-family-display`, `font-family-mono`).
   - Font sizes must use defined tokens: `font-size-xs` through `font-size-7xl`.
   - Font weights must use defined numeric weights: `300` (light), `400` (regular), `500` (medium), `600` (semibold), `700` (bold), `800` (extrabold).
   - Line heights and letter spacings must use tokenized multipliers and em values.

4. **Border Radii & Shadows / Elevation**:
   - Radii must map to `borderRadius`: `radius-none` (0), `radius-xs` (2px), `radius-sm` (4px), `radius-md` (8px), `radius-lg` (12px), `radius-xl` (16px), `radius-2xl` (24px), `radius-3xl` (32px), `radius-full` (9999px).
   - Shadows and elevation must map to `shadows` (`shadow-xs` to `shadow-2xl`, `shadow-glow-*`) or `elevation` (`elevation-0` to `elevation-5`).

---

## 3. Ergonomics & Touch Target Minimums

1. **44x44pt Touch Target Mandate**:
   - Rota serves busy clinic nurses, restaurant servers with wet hands, and retail staff on the move.
   - Every interactive component (`TouchableOpacity`, `Pressable`, `IconButton`, `Checkbox`, `TabButton`) MUST have an effective tap target of at least **44x44pt**.
   - If an icon is visually smaller (e.g., 20x20pt), you must enforce the target size using `hitSlop`:
     ```typescript
     <Pressable
       hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
       accessibilityRole="button"
       style={styles.actionIcon}
     >
       <Icon name="x" size={20} color={theme.color.onSurface} />
     </Pressable>
     ```
   - Alternatively, define container dimensions: `{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }`.

---

## 4. Component Structure & React Native StyleSheet Standard

1. **Token Module Consumption**:
   - All components must import tokens from the centralized typed token adapter (e.g., `app/src/theme/tokens.ts` derived from `matisse-tokens-all.json`).
   - Styles must be declared using `StyleSheet.create({ ... })` referencing token constants. Inline style objects with ad-hoc values are strictly prohibited.

2. **Dark Mode & Dynamic Theming**:
   - Components must consume theme tokens via context (`useTheme()`) or dynamic style hooks to ensure automatic light/dark switching without hardcoded overrides.
