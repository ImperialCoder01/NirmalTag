# ITERATION 9.16 — FINAL LIVE FIREBASE RLS IDENTITY BRIDGE VERIFICATION

**Date:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Target Migration:** `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql` (Approach B)  
**Target Project:** `ubphrqumpqdifupwbvpe.supabase.co`  
**Status:** **LIVE FIREBASE RLS BLOCKED**  

---

## 1. Executive Summary

Final live PostgREST API verification was performed against project `ubphrqumpqdifupwbvpe.supabase.co` using fresh Firebase ID tokens for the real E2E Collector account (`nirmaltag.e2e.collector@gmail.com`).

The live database responses demonstrate that **the live API layer is still serving the pre-migration schema and RLS policies**.

---

## 2. Empirical Verification Matrix

### A. Real Firebase Authentication
- **Account:** `nirmaltag.e2e.collector@gmail.com`
- **Result:** `SUCCESS` (Firebase REST Auth)
- **Firebase UID Claim:** `"X6k87mpP00gxkNq8yKn5b8laFvo1"` (28-character string)

### B. Live PostgREST RPC Path Verification
| RPC Function | Body | Expected | Live HTTP Status / Response | 22P02 / PGRST202 Status |
|---|---|---|---|---|
| `get_authenticated_firebase_uid` | `{}` | `"X6k87mpP00gxkNq8yKn5b8laFvo1"` | `HTTP 404 (PGRST202)` | **PGRST202 PRESENT** |
| `get_authenticated_profile_id` | `{}` | `"00000000-0000-4000-a000-000000000096"` | `HTTP 404 (PGRST202)` | **PGRST202 PRESENT** |
| `get_auth_jwt_sub` | `{}` | `"00000000-0000-4000-a000-000000000096"` | `HTTP 400 (22P02)` | **22P02 PRESENT** |
| `has_role` | `{"p_role":"COLLECTOR"}` | `true` | `HTTP 400 (22P02)` | **22P02 PRESENT** |

### C. Live PostgREST Endpoint Verification
| Endpoint | Method | Expected HTTP | Live HTTP Status | Error Code | 22P02 Status |
|---|---|---|---|---|---|
| `/rest/v1/profiles` | `GET` | `HTTP 200 OK` | `HTTP 400` | `22P02` | **PRESENT** |
| `/rest/v1/households` | `GET` | `HTTP 200 OK` | `HTTP 400` | `22P02` | **PRESENT** |
| `/rest/v1/tags` | `GET` | `HTTP 200 OK` | `HTTP 400` | `22P02` | **PRESENT** |
| `/rest/v1/collectors` | `GET` | `HTTP 200 OK` | `HTTP 200 [0 rows]` | N/A | ABSENT |
| `/rest/v1/user_roles` | `GET` | `HTTP 200 OK` | `HTTP 200 [0 rows]` | N/A | ABSENT |

---

## 3. Negative Authorization & Identity Spoofing Audit

- **Unauthenticated Access (`GET /profiles` without Bearer token):** Returns `HTTP 200 OK [0 rows]`.
- **Cross-Profile Query (`GET /profiles?id=neq.collector_id`):** Throws `HTTP 400 22P02`.
- **Cross-Household Query (`GET /households?id=neq.household_id`):** Throws `HTTP 400 22P02`.
- **Role Impersonation via RPC parameter:** `create_tag_batch_and_records` RPC throws `HTTP 400 22P02`.

---

## 4. Side-Effect & Integrity Audit

- **Pickups Executed:** `0`
- **Credit Transactions:** `0`
- **Incentive Transactions:** `0`
- **Active E2E Tag Status:** `ACTIVE` (Untouched, `00000000-0000-4000-a000-000000000098`)

Zero unauthorized side effects occurred during testing.

---

## 5. Technical Diagnosis & Resolution Requirements

Because PostgREST returns `PGRST202` (function not found in schema cache) and PostgreSQL returns `22P02` (invalid UUID syntax for string `"X6k87mpP00gxkNq8yKn5b8laFvo1"`), one of the following two conditions exists:

1. **PostgREST Schema Cache Reload Required:**  
   If the migration SQL was executed in the SQL Editor, PostgREST has not reloaded its schema cache yet.  
   **Fix:** In Supabase SQL Editor for project `ubphrqumpqdifupwbvpe`, run:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   Or navigate to **Project Settings** $\rightarrow$ **API** $\rightarrow$ **Reload Schema Cache**.

2. **Unexecuted Migration in Target Project:**  
   The SQL script was executed in a different tab, local environment, or was not committed by clicking "Run".  
   **Fix:** Re-open [supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql), copy all lines, paste in Supabase Dashboard SQL Editor for project `ubphrqumpqdifupwbvpe`, click **Run**, and confirm `Success. No rows returned.`

---

## 6. Final Verdict

**`LIVE FIREBASE RLS BLOCKED`**
