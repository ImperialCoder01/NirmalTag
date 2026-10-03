# ITERATION 9.16.3 — POST-MIGRATION LIVE IDENTITY VERIFICATION REPORT

## Executive Summary

This document presents the empirical live database verification conducted for **Iteration 9.16.3** to test the deployment of migration [`20261004000009_firebase_uid_rls_identity_bridge.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql).

> [!CAUTION]
> **FINAL VERDICT**: **LIVE FIREBASE RLS BLOCKED**
> 
> - **Real Firebase Authentication**: **PASS** (`nirmaltag.e2e.collector@gmail.com` authenticates cleanly; UID `X6k87mpP...` resolved).
> - **Side-Effect Safety**: **PASS** (0 pickups, 0 credit transactions, 0 incentive payouts, **1 ACTIVE tag**).
> - **Live Database Policy Status**: **NOT APPLIED** (Empirical REST inspection proved that live `profiles`, `households`, and `tags` policies still reference `auth.uid()::text`, throwing HTTP 400 `22P02`).

---

## 1. Empirical REST API Table Inspection Breakdown

To determine exact live policy state, HTTP GET requests carrying the real Firebase ID Token (`Authorization: Bearer <Firebase_ID_Token>`) were executed against each Supabase REST table endpoint:

| Table | HTTP Status | Response Payload | Forensic Diagnosis |
| :--- | :--- | :--- | :--- |
| `mcd_zones` | **HTTP 200** | `[]` (0 rows) | Live RLS policy has no `auth.uid()` dependency. |
| `mcd_wards` | **HTTP 200** | `[]` (0 rows) | Live RLS policy has no `auth.uid()` dependency. |
| `organizations` | **HTTP 200** | `[]` (0 rows) | Live RLS policy has no `auth.uid()` dependency. |
| `user_roles` | **HTTP 200** | `[]` (0 rows) | Live RLS policy has no `auth.uid()` dependency. |
| `collectors` | **HTTP 200** | `[]` (0 rows) | Live RLS policy has no `auth.uid()` dependency. |
| `tag_batches` | **HTTP 200** | `[]` (0 rows) | Live RLS policy has no `auth.uid()` dependency. |
| `profiles` | **HTTP 400** | `22P02: invalid input syntax for type uuid: "X6k87mpP..."` | **Unapplied Migration**: Live policy still uses `firebase_uid = auth.uid()::text` from `20261003000002`. |
| `households` | **HTTP 400** | `22P02: invalid input syntax for type uuid: "X6k87mpP..."` | **Unapplied Migration**: Live policy still uses `firebase_uid = auth.uid()::text` from `20261003000002`. |
| `tags` | **HTTP 400** | `22P02: invalid input syntax for type uuid: "X6k87mpP..."` | **Unapplied Migration**: Live policy still uses `firebase_uid = auth.uid()::text` from `20261003000002`. |

---

## 2. Technical Root Cause & Verification Matrix

```mermaid
flowchart TD
    A["Firebase Auth Client signs in"] -->|Acquires ID Token| B["HTTP Header: Bearer <Firebase JWT>"]
    B -->|PostgREST Request to /rest/v1/profiles| C["Live Supabase Database"]
    C -->|Old RLS Policy in Live DB| D["firebase_uid = auth.uid()::text"]
    D -->|Supabase auth.uid() function| E["(claims ->> 'sub')::uuid"]
    E -->|Cast 'X6k87mpP...' to uuid| F["PostgreSQL Error 22P02 (HTTP 400)"]
    F -->|Remediation: Apply Migration 0009| G["Replace policies with get_authenticated_firebase_uid()"]
    G -->|Result| H["Zero 22P02 Errors & HTTP 200 Profile Resolution"]
```

| Domain | Expected Condition | Empirical Observation | Status |
| :--- | :--- | :--- | :--- |
| **Real Firebase Auth** | Authenticates `nirmaltag.e2e.collector@gmail.com` | Firebase Auth REST API returned `200 OK` with valid Firebase ID Token (UID: `X6k87mpP...`). | **PASS** |
| **22P02 Elimination** | 0 `22P02` errors on PostgREST requests | `profiles`, `households`, `tags` returned `HTTP 400 22P02` because migration `0009` is unapplied in live DB. | **FAIL (Live DB)** |
| **Identity Resolution** | JWT sub $\to$ `get_authenticated_firebase_uid()` $\to$ `profiles.firebase_uid` $\to$ `profiles.id` | Logic verified in [`20261004000009`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql). Blocked on live API until migration `0009` is executed in SQL Editor. | **FAIL (Live DB)** |
| **Collector Role & Entity** | Resolves `COLLECTOR` role and Org/Ward bindings | Logic verified in [`20261004000009`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql). Blocked on live API until migration `0009` is executed in SQL Editor. | **FAIL (Live DB)** |
| **Negative Security Tests** | 15 security test cases pass | Verified in [`web/tests/firebase_identity_bridge.test.mjs`](file:///d:/LOQ/Documents/WasteChakra/web/tests/firebase_identity_bridge.test.mjs) (**15/15 PASS**). | **PASS** |
| **Side-Effect Safety** | 0 pickups, 0 credit transactions, 1 ACTIVE tag | Verified via `get_tag_inventory_summary()` RPC: `ACTIVE` count = **1**, `VERIFIED` = 0, `PICKUP_PENDING` = 0. | **PASS** |

---

## 3. Comprehensive Regression Suite Results

| Test Suite | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Web Unit & Security Tests** | `node --env-file=.env.local --test tests/*.test.mjs` | **PASS** | 54/54 tests passed (1.7s) |
| **Web Production Build** | `npm run build` | **PASS** | 28/28 static/dynamic routes compiled |
| **Android Unit Tests** | `.\gradlew testDebugUnitTest` | **PASS** | 24/24 unit tests passed |
| **Android Instrumentation Tests** | `.\gradlew connectedAndroidTest` | **PASS** | 3/3 tests passed on emulator `Medium_Phone_API_37.0` |
| **Android Debug APK Build** | `.\gradlew assembleDebug` | **PASS** | Debug APK built cleanly |
| **Repository Secret Scan** | `git grep "eyJ"` | **PASS** | 0 secrets or JWT strings committed |

---

## 4. Required Action for Project Owner

To complete the live database update:

1. Open **Supabase Dashboard** $\to$ **SQL Editor**.
2. Open [`supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql).
3. Execute the SQL migration.
4. Re-run post-migration live verification script to confirm HTTP 200 response and proceed to Collector E2E.

---

## 5. Final Verdict

```
===========================================================
FINAL VERDICT: LIVE FIREBASE RLS BLOCKED
Blocker: Live Supabase database has not executed migration
20261004000009_firebase_uid_rls_identity_bridge.sql.
All repository code & test suites: 100% PASS (54/54).
===========================================================
```

---
*Generated for NirmalTag Iteration 9.16.3 Post-Migration Live Identity Verification.*
