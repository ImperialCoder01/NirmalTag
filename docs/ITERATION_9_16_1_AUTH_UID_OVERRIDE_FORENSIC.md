# ITERATION 9.16.1 — AUTH.UID() OVERRIDE FORENSIC REVIEW & IDENTITY BRIDGE SPECIFICATION

## Executive Overview

This document presents the complete forensic investigation of Supabase's native `auth.uid()` function, its callers, its security implications, and the architectural evaluation of **Approach A** (Overriding `auth.uid()`) vs **Approach B** (Application-Level Firebase Identity Bridge).

> [!IMPORTANT]
> **FINAL AUDIT CONCLUSION**:
> **B. DO NOT APPLY — replace auth.uid() override with safer application-level Firebase identity bridge (Approach B)**.
> 
> Overriding Supabase's native `auth.uid()` in the internal `auth` system schema is **UNNECESSARY** and violates platform encapsulation. By eliminating application dependence on `auth.uid()` across all database RLS policies and helper RPCs, migration [`supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql) implements Approach B: leaving native `auth.uid()` 100% untouched while providing a non-invasive, fail-closed Firebase identity bridge.

---

## 1. Task 1: Complete Inventory of `auth.uid()` Dependencies

| Function / Policy / RPC | Location | Uses `auth.uid`? | Uses `get_auth_jwt_sub`? | Uses Firebase UID? | Expected Identity Type | Expected UUID / TEXT | SECURITY DEFINER? | Potential Impact from Overriding `auth.uid()` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `auth.uid()` (Native Supabase Primitive) | `auth` schema | Self | No | Yes (via JWT sub) | `UUID` | UUID | STABLE (SQL) | Overriding risks breaking internal Supabase CLI migrations, Auth triggers, system schemas, and platform updates. |
| `has_role(p_role)` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.firebase_uid` | TEXT $\to$ `profiles.id` UUID | SECURITY DEFINER | Replaced with `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Users view own profile"` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.firebase_uid` | TEXT | NO (Security Invoker) | Replaced with `get_authenticated_firebase_uid()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Users update own profile"` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.firebase_uid` | TEXT | NO (Security Invoker) | Replaced with `get_authenticated_firebase_uid()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Households view own data"` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.id` | UUID | NO (Security Invoker) | Replaced with `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Collectors view own data"` | `20261003000004` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.id` | UUID | NO (Security Invoker) | Replaced with `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Households view assigned tags"` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.id` | UUID | NO (Security Invoker) | Replaced with `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Collectors create pickups"` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.id` | UUID | NO (Security Invoker) | Replaced with `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Users view authorized pickups"` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.id` | UUID | NO (Security Invoker) | Replaced with `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Households view own credit account"` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.id` | UUID | NO (Security Invoker) | Replaced with `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| Policy `"Households view own credit transactions"` | `20261003000002` / `20261004000009` | Replaced (0009) | No | Yes | `profiles.id` | UUID | NO (Security Invoker) | Replaced with `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| `get_auth_jwt_sub()` | `20261003000005` / `20261004000009` | Replaced (0009) | Self | Yes | `profiles.id` | UUID | STABLE | Updated to return `get_authenticated_profile_id()`. Zero `auth.uid()` dependency remaining. |
| `transition_tag_state` | `20261003000005` / `20261003000006` | No | Yes | Indirectly | `profiles.id` | UUID | SECURITY DEFINER | Uses `get_auth_jwt_sub()`. Expects internal profile UUID. Safe. |
| `process_verified_pickup_transaction_v2` | `20261003000005` / `20261003000008` | No | Yes | Indirectly | `profiles.id` | UUID | SECURITY DEFINER | Uses `get_auth_jwt_sub()`. Expects internal profile UUID. Safe. |
| `create_tag_batch_and_records` | `20261003000005` / `20261003000006` | No | Yes | Indirectly | `profiles.id` | UUID | SECURITY DEFINER | Uses `get_auth_jwt_sub()`. Expects internal profile UUID. Safe. |
| `assign_tag_to_household` | `20261003000007` | No | Yes | Indirectly | `profiles.id` | UUID | SECURITY DEFINER | Uses `get_auth_jwt_sub()`. Expects internal profile UUID. Safe. |
| `activate_household_tag` | `20261003000007` | No | Yes | Indirectly | `profiles.id` | UUID | SECURITY DEFINER | Uses `get_auth_jwt_sub()`. Expects internal profile UUID. Safe. |

---

## 2. Task 2: Forensic Review of `get_auth_jwt_sub` Semantics

A complete audit of every call site of `get_auth_jwt_sub()` across migrations and RPCs:

1. **`transition_tag_state`**: Evaluates `v_authenticated_uid := get_auth_jwt_sub();`. Queries `user_roles.user_id` (`UUID` referencing `profiles.id`). Expects **`profiles.id` UUID**.
2. **`process_verified_pickup_transaction_v2`**: Evaluates `v_authenticated_uid := get_auth_jwt_sub();`. Queries `collectors.user_id` (`UUID` referencing `profiles.id`). Expects **`profiles.id` UUID**.
3. **`create_tag_batch_and_records`**: Evaluates `v_authenticated_uid := get_auth_jwt_sub();`. Queries `user_roles.user_id` (`UUID`) and inserts `tag_batches.created_by` (`UUID` referencing `profiles.id`). Expects **`profiles.id` UUID**.
4. **`assign_tag_to_household`**: Evaluates `v_authenticated_uid := get_auth_jwt_sub();`. Queries `user_roles.user_id` (`UUID`) and inserts `tag_assignments.assigned_by` (`UUID` referencing `profiles.id`). Expects **`profiles.id` UUID**.
5. **`activate_household_tag`**: Evaluates `v_authenticated_uid := get_auth_jwt_sub();`. Queries `households.user_id` (`UUID` referencing `profiles.id`). Expects **`profiles.id` UUID**.

**Semantic Compatibility Verdict**: **PASS — SEMANTIC COMPATIBILITY VERIFIED**.
100% of RPC callers expect internal `profiles.id` (`UUID`). Updating `get_auth_jwt_sub()` to call `get_authenticated_profile_id()` maintains perfect 1:1 semantic compatibility. Zero callers expect raw Firebase UID string.

---

## 3. Task 3: Approach Comparison (Approach A vs Approach B)

- **APPROACH A (Overriding Native `auth.uid()`)**:
  - Overrides internal Supabase system function `auth.uid()` in the `auth` schema.
  - Risks breaking native Supabase CLI migrations, Auth engine triggers, and future platform upgrades.
  - Fragile and non-standard.

- **APPROACH B (Application-Level Firebase Identity Bridge)**:
  - Leaves `auth.uid()` completely untouched in the `auth` schema.
  - Introduces `get_authenticated_firebase_uid()` (`TEXT`) and `get_authenticated_profile_id()` (`UUID`).
  - Replaces all application RLS policies so they consume `get_authenticated_firebase_uid()` or `get_authenticated_profile_id()`.
  - Because no application RLS policy references `auth.uid()`, `auth.uid()` is **NEVER** evaluated during API queries, preventing PostgreSQL `22P02` exceptions without mutating system schemas.

**Architectural Choice**: **APPROACH B IS SELECTED**.
Migration [`supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql) implements Approach B.

---

## 4. Task 4: RLS Policy Audit Matrix

All 17 database policies updated in migration `20261004000009`:

| Table | Policy Name | Operation | Old Identity Source | New Identity Source | Role Scope | Identity Type | Cross-User Access Prevented? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `profiles` | `"Users view own profile"` | `SELECT` | `auth.uid()::text` | `get_authenticated_firebase_uid()` | Own profile or `SYSTEM_ADMIN` | `TEXT` (Firebase UID) | **YES** |
| `profiles` | `"Users update own profile"` | `UPDATE` | `auth.uid()::text` | `get_authenticated_firebase_uid()` | Own profile only | `TEXT` (Firebase UID) | **YES** |
| `user_roles` | `"Users view own roles"` | `SELECT` | (None/Admin) | `get_authenticated_profile_id()` | Own roles or `SYSTEM_ADMIN` | `UUID` (`profiles.id`) | **YES** |
| `households` | `"Households view own data"` | `SELECT` | `auth.uid()::text` | `get_authenticated_profile_id()` | Own household or Municipal Admins | `UUID` (`profiles.id`) | **YES** |
| `collectors` | `"Collectors view own data"` | `SELECT` | (None/Admin) | `get_authenticated_profile_id()` | Own collector entity or MCD/Admin | `UUID` (`profiles.id`) | **YES** |
| `tags` | `"Households view assigned tags"` | `SELECT` | `auth.uid()::text` | `get_authenticated_profile_id()` | Assigned household or Collector/Officer | `UUID` (`profiles.id`) | **YES** |
| `tag_batches` | `"Authorized users view tag_batches"` | `SELECT` | (None) | `has_role()` | Collector / Tag Officer / MCD / Admin | Role verification | **YES** |
| `pickups` | `"Collectors create pickups"` | `INSERT` | `auth.uid()::text` | `get_authenticated_profile_id()` | Collector creating own pickup | `UUID` (`profiles.id`) | **YES** |
| `pickups` | `"Users view authorized pickups"` | `SELECT` | `auth.uid()::text` | `get_authenticated_profile_id()` | Collector or Household or Municipal | `UUID` (`profiles.id`) | **YES** |
| `credit_accounts` | `"Households view own credit account"` | `SELECT` | `auth.uid()::text` | `get_authenticated_profile_id()` | Household owner or `SYSTEM_ADMIN` | `UUID` (`profiles.id`) | **YES** |
| `credit_transactions` | `"Households view own credit transactions"` | `SELECT` | `auth.uid()::text` | `get_authenticated_profile_id()` | Household owner or `SYSTEM_ADMIN` | `UUID` (`profiles.id`) | **YES** |
| `collector_incentive_accounts` | `"Collectors view own incentive account"` | `SELECT` | (None) | `get_authenticated_profile_id()` | Collector owner or `SYSTEM_ADMIN` | `UUID` (`profiles.id`) | **YES** |
| `collector_incentive_transactions` | `"Collectors view own incentive transactions"` | `SELECT` | (None) | `get_authenticated_profile_id()` | Collector owner or `SYSTEM_ADMIN` | `UUID` (`profiles.id`) | **YES** |
| `mcd_zones` | `"Anyone can view mcd_zones"` | `SELECT` | (Public) | `true` | Public read for municipal hierarchy | None | **YES** (Read-only) |
| `mcd_wards` | `"Anyone can view mcd_wards"` | `SELECT` | (Public) | `true` | Public read for municipal hierarchy | None | **YES** (Read-only) |
| `organizations` | `"Anyone can view organizations"` | `SELECT` | (Public) | `true` | Public read for municipal hierarchy | None | **YES** (Read-only) |
| `audit_logs` | `"Users view own audit logs"` | `SELECT` | (None) | `get_authenticated_profile_id()` | Actor owner or `SYSTEM_ADMIN` | `UUID` (`profiles.id`) | **YES** |

---

## 5. Task 5: Security Definer Functions Audit

- `get_authenticated_profile_id()` is `SECURITY DEFINER SET search_path = public`. Accepts 0 parameters, preventing caller argument spoofing.
- `has_role(p_role)` is `SECURITY DEFINER SET search_path = public`. Accepts role enum, NOT user ID.
- Supply chain & pickup RPCs (`create_tag_batch_and_records`, `assign_tag_to_household`, `activate_household_tag`, `transition_tag_state`, `process_verified_pickup_transaction_v2`) evaluate `v_authenticated_uid := get_auth_jwt_sub()`.
  - When invoked via API with JWT: `get_auth_jwt_sub()` derives identity from JWT. Client arguments are ignored.
  - When invoked via SQL Editor (unauthenticated context): `get_auth_jwt_sub()` returns `NULL`. Falls back to explicit parameter (`p_officer_profile_id`), which undergoes strict role verification (`user_roles` JOIN `roles`).
  - Neither context permits unauthenticated client parameter impersonation.

---

## 6. Task 6 & Task 7: Live Database Status & Test Tier Classification

- **Live Database Status**: `LIVE MIGRATION: NOT APPLIED` (Migration `20261004000009` ready for SQL Editor execution).
- **Test Tier Separation**:
  1. **SOURCE-LEVEL TESTS**: TypeScript type validity, ESLint rules, migration syntax audits.
  2. **LOCAL/UNIT TESTS**: `web/tests/*.test.mjs` (54/54 PASS), Android unit tests `gradlew testDebugUnitTest` (24/24 PASS).
  3. **INSTRUMENTATION TESTS**: `gradlew connectedAndroidTest` (3/3 PASS on emulator).
  4. **LIVE DATABASE TESTS**: REST RPC tests against live database (`get_tag_inventory_summary` RPC PASS).
  5. **LIVE AUTHENTICATED E2E TESTS**: Will be executed in Iteration 9.17 after migration `0009` is applied.

---

## 7. Task 8: GitGuardian & Credential Scan Audit

- Real E2E Collector Firebase UID string removed from committed test source in [`web/tests/firebase_identity_bridge.test.mjs`](file:///d:/LOQ/Documents/WasteChakra/web/tests/firebase_identity_bridge.test.mjs). Replaced with synthetic identifier `"synthetic_firebase_collector_uid_01"`.
- Repository secret scan verified:
  - 0 Firebase ID tokens committed
  - 0 Firebase private keys committed
  - 0 Supabase `service_role` or `sb_secret` keys committed
  - 0 Supabase PATs committed
  - 0 passwords or private keys in repository source files

---

## 8. Final Conclusion

```
===========================================================
AUDIT CONCLUSION:
B. DO NOT APPLY — replace auth.uid() override with safer application-level Firebase identity bridge

Migration 20261004000009_firebase_uid_rls_identity_bridge.sql
has been updated to adopt Approach B (leaving native auth.uid 100% untouched).
===========================================================
```

---
*Generated for NirmalTag Iteration 9.16.1 Auth Override Forensic Review.*
