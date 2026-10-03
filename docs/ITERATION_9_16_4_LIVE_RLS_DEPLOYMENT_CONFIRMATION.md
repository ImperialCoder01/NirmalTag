# ITERATION 9.16.4 — LIVE FIREBASE RLS IDENTITY BRIDGE DEPLOYMENT CONFIRMATION

**Date:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Target Migration:** `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql` (Approach B)  
**Status:** **LIVE FIREBASE RLS BLOCKED — MIGRATION NOT YET EXECUTED IN LIVE DATABASE**  

---

## 1. Executive Summary

Iteration 9.16.4 performed real, authenticated HTTP PostgREST API live database verification against the project's live Supabase instance (`ubphrqumpqdifupwbvpe.supabase.co`).

The live PostgREST API tests conclusively prove that **Migration 0009 (`20261004000009_firebase_uid_rls_identity_bridge.sql`) has NOT YET BEEN EXECUTED in the live Supabase SQL Editor** (or was executed in a different database/project).

### Empirical Findings Summary:
1. **Firebase Authentication**: Successfully authenticated `nirmaltag.e2e.collector@gmail.com` via Firebase REST API, yielding a fresh Firebase ID Token with `sub = "X6k87mpP00gxkNq8yKn5b8laFvo1"`.
2. **PostgreSQL Error 22P02 Persists**:
   - `GET /rest/v1/profiles` $\rightarrow$ `HTTP 400 (22P02: invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1")`
   - `GET /rest/v1/households` $\rightarrow$ `HTTP 400 (22P02)`
   - `GET /rest/v1/tags` $\rightarrow$ `HTTP 400 (22P02)`
3. **New Identity Helper Functions Missing (HTTP 404 / PGRST202)**:
   - `POST /rest/v1/rpc/get_authenticated_firebase_uid` $\rightarrow$ `HTTP 404 (PGRST202: Could not find the function public.get_authenticated_firebase_uid without parameters in the schema cache)`
   - `POST /rest/v1/rpc/get_authenticated_profile_id` $\rightarrow$ `HTTP 404 (PGRST202: Could not find the function public.get_authenticated_profile_id without parameters in the schema cache)`
4. **Legacy Functions Still In Place**:
   - `POST /rest/v1/rpc/get_auth_jwt_sub` $\rightarrow$ `HTTP 400 (22P02)` (Proves legacy implementation with `(claims ->> 'sub')::uuid` is still running in live Postgres).
   - `POST /rest/v1/rpc/has_role` $\rightarrow$ `HTTP 400 (22P02)`

---

## 2. Detailed Test Trajectory & Log Evidence

The verification script `web/verify_live_9_16_4.mjs` was executed against the live project endpoints:

```text
Found credentials for: nirmaltag.e2e.collector@gmail.com
Firebase API key present: true
Firebase Auth SUCCESS!
Firebase UID: X6k87mpP00gxkNq8yKn5b8laFvo1

--- 1. POSTGREST TABLE ENDPOINT TESTS WITH FIREBASE ID TOKEN ---
Endpoint /profiles: HTTP 400 {
  code: '22P02',
  details: null,
  hint: null,
  message: 'invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1"'
}
Endpoint /households: HTTP 400 {
  code: '22P02',
  details: null,
  hint: null,
  message: 'invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1"'
}
Endpoint /tags: HTTP 400 {
  code: '22P02',
  details: null,
  hint: null,
  message: 'invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1"'
}
Endpoint /collectors: HTTP 200 [0 rows]
Endpoint /user_roles: HTTP 200 [0 rows]

--- 2. IDENTITY BRIDGE RPC VERIFICATION ---
RPC get_authenticated_firebase_uid({}): HTTP 404 => {
  code: 'PGRST202',
  details: 'Searched for the function public.get_authenticated_firebase_uid without parameters or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.',
  message: 'Could not find the function public.get_authenticated_firebase_uid without parameters in the schema cache'
}
RPC get_authenticated_profile_id({}): HTTP 404 => {
  code: 'PGRST202',
  details: 'Searched for the function public.get_authenticated_profile_id without parameters or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.',
  message: 'Could not find the function public.get_authenticated_profile_id without parameters in the schema cache'
}
RPC get_auth_jwt_sub({}): HTTP 400 => {
  code: '22P02',
  message: 'invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1"'
}
RPC has_role({"p_role":"COLLECTOR"}): HTTP 400 => {
  code: '22P02',
  message: 'invalid input syntax for type uuid: "X6k87mpP00gxkNq8yKn5b8laFvo1"'
}
```

---

## 3. Why This Behavior Proves Migration 0009 Is Not Applied

1. **`22P02` Error Origin**:
   PostgreSQL error `22P02` occurs when standard Postgres casts a non-UUID string (`"X6k87mpP00gxkNq8yKn5b8laFvo1"`) to type `UUID`.
   - In Migration 0009 (Approach B), `get_authenticated_firebase_uid()` extracts `(claims ->> 'sub')` as **`TEXT`**, with zero `UUID` casting.
   - The updated RLS policies compare `firebase_uid = get_authenticated_firebase_uid()` (`TEXT` = `TEXT`), which CANNOT trigger `22P02`.
   - Because `SELECT * FROM profiles` throws `22P02`, the live database is still evaluating the OLD RLS policy `firebase_uid = auth.uid()::text` or `auth.uid()`.

2. **`PGRST202` Missing Function**:
   PostgREST returns `PGRST202` when a requested RPC function does not exist in the database schema.
   - `get_authenticated_firebase_uid()` and `get_authenticated_profile_id()` are explicitly defined in Migration 0009.
   - Because PostgREST returns `404 PGRST202`, these functions do not exist in the live database schema.

---

## 4. Required Action to Unblock

The project owner must copy the entire contents of:
`supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql`

and execute it in the **Supabase Dashboard SQL Editor** for project `ubphrqumpqdifupwbvpe`:

1. Open Supabase Dashboard $\rightarrow$ **SQL Editor**.
2. Create a new query.
3. Paste the contents of `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql`.
4. Click **Run**.
5. Ensure SQL Editor reports `Success. No rows returned`.

Once executed, re-running `node web/verify_live_9_16_4.mjs` will return `HTTP 200 OK` for `/profiles`, `/households`, `/tags`, `/collectors`, and `/user_roles`, with zero `22P02` errors.

---

## 5. Side Effect Audit

- **Pickups Executed:** `0`
- **Credits Awarded:** `0`
- **Incentive Payouts:** `0`
- **Tag Status:** Active E2E tag remains `ACTIVE` (untouched).
- **Mutations:** Zero database mutations occurred during verification.

---

## 6. Final Verdict

**`LIVE FIREBASE RLS BLOCKED — MIGRATION 20261004000009 NOT YET EXECUTED IN LIVE SUPABASE DATABASE`**
