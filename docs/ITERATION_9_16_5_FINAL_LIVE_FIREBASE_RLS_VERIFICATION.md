# ITERATION 9.16.5 — FINAL LIVE FIREBASE RLS IDENTITY BRIDGE VERIFICATION

**Date:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Target Migration:** `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql` (Approach B)  
**Status:** **LIVE FIREBASE RLS BLOCKED**  

---

## 1. Migration Inspection Result (Phase 1)
Pre-execution static analysis of `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql`:

| Check # | Verification Requirement | Result | Notes |
|---|---|---|---|
| 1 | Uses Approach B (Non-invasive identity bridge) | **PASS** | `auth.uid()` left 100% untouched. |
| 2 | Defines `get_authenticated_firebase_uid()` and `get_authenticated_profile_id()` | **PASS** | Functions defined in `public` schema. |
| 3 | `get_authenticated_firebase_uid()` treats `sub` as `TEXT` | **PASS** | `v_sub := v_claims ->> 'sub';` returns `TEXT`. |
| 4 | `get_authenticated_profile_id()` resolves `profiles.id` | **PASS** | Queries `profiles` table by `firebase_uid`. |
| 5 | `get_auth_jwt_sub()` semantically compatible | **PASS** | Delegates to `get_authenticated_profile_id()`. |
| 6 | `has_role()` uses application identity bridge | **PASS** | Uses `get_authenticated_profile_id()` for role check. |
| 7 | Application RLS policies use new identity helpers | **PASS** | RLS updated across 12 core tables. |
| 8 | NO `CREATE OR REPLACE FUNCTION auth.uid()` | **PASS** | Zero modification to `auth` schema. |
| 9 | NO native Supabase `auth` schema mutation | **PASS** | `auth` schema clean. |
| 10 | NO credentials or secrets in file | **PASS** | Clean migration file. |

**Phase 1 Result:** **PASS** — Migration file is 100% compliant and ready for execution.

---

## 2. Migration Execution Result (Phase 2)
- **Status:** **NOT YET EXECUTED IN LIVE DATABASE**
- **Details:** The migration has not yet been executed in the live Supabase SQL Editor (`ubphrqumpqdifupwbvpe.supabase.co`).

---

## 3. Live Function Existence (Phase 3)
Live REST RPC checks (`/rest/v1/rpc/<function_name>`):
- `get_authenticated_firebase_uid`: `HTTP 404 (PGRST202: Could not find function in schema cache)`
- `get_authenticated_profile_id`: `HTTP 404 (PGRST202: Could not find function in schema cache)`

**Phase 3 Result:** **FAIL** — Functions do not exist in live schema.

---

## 4. Real Firebase Authentication (Phase 4)
- **Account:** `nirmaltag.e2e.collector@gmail.com`
- **Method:** Real Firebase REST Auth (`identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`)
- **Firebase Authentication Status:** **SUCCESS**
- **Token Claims:** `sub = "X6k87mpP00gxkNq8yKn5b8laFvo1"` (28-char string format)

**Phase 4 Result:** **PASS** — Real Firebase token acquired successfully.

---

## 5. Firebase UID Resolution (Phase 5)
- **Endpoint:** `POST /rest/v1/rpc/get_authenticated_firebase_uid`
- **Status:** `HTTP 404 PGRST202`
- **Result:** **FAIL** — Cannot resolve Firebase UID via RPC due to unexecuted migration.

---

## 6. Profile UUID Resolution (Phase 5)
- **Endpoint:** `POST /rest/v1/rpc/get_authenticated_profile_id`
- **Status:** `HTTP 404 PGRST202`
- **Result:** **FAIL** — Cannot resolve profile UUID via RPC due to unexecuted migration.

---

## 7. COLLECTOR Role Resolution (Phase 5)
- **Endpoint:** `POST /rest/v1/rpc/has_role` (`p_role = "COLLECTOR"`)
- **Status:** `HTTP 400 22P02` (`invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1"`)
- **Result:** **FAIL** — Legacy `has_role` function executed, attempting `::uuid` cast on Firebase UID.

---

## 8. Live Table Access & 22P02 Result (Phase 6)
Requests sent with real Firebase ID Token in `Authorization: Bearer <token>`:
- `GET /rest/v1/profiles` $\rightarrow$ `HTTP 400 22P02`
- `GET /rest/v1/households` $\rightarrow$ `HTTP 400 22P02`
- `GET /rest/v1/tags` $\rightarrow$ `HTTP 400 22P02`

**Phase 6 Result:** **FAIL** — `22P02` errors persist because live RLS policies still evaluate `auth.uid()`.

---

## 9. Negative RLS Tests (Phase 7)
- **Status:** **BLOCKED** — Unauthenticated and cross-user requests cannot be evaluated until migration 0009 is applied. Unauthenticated `GET /profiles` currently returns `HTTP 200 OK [0 rows]`.

---

## 10. Identity Spoofing Tests (Phase 8)
- **Status:** **BLOCKED** — PostgREST RPC parameters cannot override identity once migration 0009 is active.

---

## 11. Side-Effect Verification (Phase 9)
- **Pickups Executed:** `0`
- **Credit Transactions:** `0`
- **Incentive Payouts:** `0`
- **E2E Tag Status:** `ACTIVE` (Untouched)

**Phase 9 Result:** **PASS** — Zero mutations or side effects.

---

## 12. Regression Tests (Phase 10)
- **Status:** Deferred until migration 0009 is successfully deployed and verified in the live database.

---

## Exact Remaining Blocker

**LIVE DATABASE DEPLOYMENT**: Migration `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql` must be copied and executed in the **Supabase Dashboard SQL Editor** for live project `ubphrqumpqdifupwbvpe`.

### Instructions for Project Owner:
1. Open Supabase Dashboard $\rightarrow$ **SQL Editor**.
2. Create a new query.
3. Paste the contents of `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql`.
4. Run the query and verify it succeeds (`Success. No rows returned`).
5. Re-trigger iteration 9.16 verification.

---

## Final Verdict

**`LIVE FIREBASE RLS BLOCKED`**
