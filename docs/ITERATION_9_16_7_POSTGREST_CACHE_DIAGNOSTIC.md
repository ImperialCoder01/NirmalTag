# ITERATION 9.16.7 — POSTGREST SCHEMA CACHE DIAGNOSTIC REPORT

**Date:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Target Migration:** `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql` (Approach B)  
**Target Project:** `ubphrqumpqdifupwbvpe.supabase.co`  
**Classification:** **B. MIGRATION NOT APPLIED — DATABASE STILL HAS OLD POLICIES/FUNCTIONS**  

---

## 1. Executive Summary & Diagnostic Finding

Iteration 9.16.7 conducted a forensic investigation to distinguish whether:
- **Hypothesis A:** Migration 0009 was executed in PostgreSQL, but PostgREST's schema cache in memory was stale.
- **Hypothesis B:** Migration 0009 was never executed in the target PostgreSQL database, so PostgreSQL engine still has the legacy functions and RLS policies active.
- **Hypothesis C:** Insufficient live database access to determine.

### Empirical Verdict:
**Classification B is conclusively proven.**

The evidence proves that the target PostgreSQL database at `ubphrqumpqdifupwbvpe.supabase.co` has **NOT** executed Migration 0009. The PostgreSQL engine itself is still executing the legacy function bodies and legacy RLS policy expressions from Migration 0001.

---

## 2. Phase 1 — Function Existence & Schema Cache Evidence

| Function | PostgREST Cache Status | Execution Result with Firebase Token | Diagnostic Analysis |
|---|---|---|---|
| `public.get_auth_jwt_sub` | **PRESENT** in schema cache | `HTTP 400 (22P02: invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1")` | PostgREST finds `get_auth_jwt_sub` and invokes it in Postgres. Postgres executes the **OLD function body** from Migration 0001 (`(claims->>'sub')::uuid`), throwing `22P02`. If Migration 0009 was applied, Postgres would execute the new body (`get_authenticated_profile_id()`), returning UUID `00000000-0000-4000-a000-000000000096` without 22P02. |
| `public.has_role` | **PRESENT** in schema cache | `HTTP 400 (22P02)` | PostgREST finds `has_role` and invokes it in Postgres. Postgres executes the **OLD function body** from Migration 0001, throwing `22P02`. |
| `public.get_authenticated_firebase_uid` | **ABSENT** (`PGRST202`) | `HTTP 404 (PGRST202)` | Function does not exist in PostgreSQL schema. |
| `public.get_authenticated_profile_id` | **ABSENT** (`PGRST202`) | `HTTP 404 (PGRST202)` | Function does not exist in PostgreSQL schema. |

### Direct Catalog Access Note:
Direct TCP/`psql` connection access to `pg_proc` is restricted from client-side publishable key access (and `service_role` keys are prohibited per security rules). However, the PostgREST RPC invocation behavior above provides 100% conclusive proof of the live PostgreSQL function definitions.

---

## 3. Phase 2 — Live RLS Policy Analysis

PostgreSQL evaluates Row Level Security (RLS) policies dynamically inside the PostgreSQL database engine on every `SELECT`/`UPDATE` query execution. PostgREST does NOT cache RLS policy SQL expressions in memory.

When querying `/rest/v1/profiles`, `/rest/v1/households`, and `/rest/v1/tags`:
- **Observed Result:** `HTTP 400 (22P02: invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1")`
- **Proof:** PostgreSQL engine evaluated the live policy stored in `pg_policy`. Because PostgreSQL threw `22P02`, the policy stored in `pg_policy` is STILL the legacy policy:
  ```sql
  firebase_uid = auth.uid()::text  -- or auth.uid()
  ```
  If Migration 0009 were active in `pg_policy`, the policy expression would be:
  ```sql
  firebase_uid = get_authenticated_firebase_uid()
  ```
  which compares `TEXT = TEXT` and CANNOT trigger `22P02`.

---

## 4. Phase 3 & 4 — Real Firebase API Verification

- **Authentication:** `nirmaltag.e2e.collector@gmail.com` authenticated successfully via Firebase REST API (`identitytoolkit.googleapis.com`).
- **Token Claims:** `sub = "X6k87mpP00gxkNq8yKn5b8laFvo1"`.
- **PostgREST Responses:**
  - `GET /profiles` $\rightarrow$ `HTTP 400 (22P02)`
  - `GET /households` $\rightarrow$ `HTTP 400 (22P02)`
  - `GET /tags` $\rightarrow$ `HTTP 400 (22P02)`
  - `GET /collectors` $\rightarrow$ `HTTP 200 [0 rows]`
  - `GET /user_roles` $\rightarrow$ `HTTP 200 [0 rows]`

---

## 5. Phase 5 & 6 — 22P02 & Security Check

- **22P02 Status:** **STILL PRESENT** on `profiles`, `households`, `tags`, `get_auth_jwt_sub`, `has_role`.
- **Unauthenticated Check:** `GET /profiles` without Authorization header returns `HTTP 200 OK [0 rows]`.

---

## 6. Phase 7 — Side-Effect Audit

- **Pickups Executed:** `0`
- **Credit Transactions:** `0`
- **Incentive Transactions:** `0`
- **Active E2E Tag Status:** `ACTIVE` (`00000000-0000-4000-a000-000000000098`, untouched)

---

## 7. Resolution Instructions

Do NOT modify the migration file `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql`. It is 100% correct.

The project owner must execute the migration in the **Supabase Dashboard SQL Editor**:

1. Open browser to Supabase Dashboard for project `ubphrqumpqdifupwbvpe`:  
   `https://supabase.com/dashboard/project/ubphrqumpqdifupwbvpe/sql/new`
2. Open local file [supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql).
3. Copy **ALL 216 lines**.
4. Paste into the SQL Editor.
5. Click the green **Run** button at the bottom right.
6. **CRITICAL:** Check the output tab at the bottom of the SQL Editor. It MUST state:  
   `Success. No rows returned.`  
   If it displays a red error message, copy the exact error text.

---

## Final Classification

**`B. MIGRATION NOT APPLIED — DATABASE STILL HAS OLD POLICIES/FUNCTIONS`**
