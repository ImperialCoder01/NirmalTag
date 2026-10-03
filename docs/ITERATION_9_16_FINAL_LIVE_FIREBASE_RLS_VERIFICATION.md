# ITERATION 9.16 — FINAL LIVE FIREBASE RLS IDENTITY BRIDGE VERIFICATION

**Date:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Target Migration:** `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql` (Approach B)  
**Target Project Reference:** `ubphrqumpqdifupwbvpe`  
**Status:** **LIVE FIREBASE RLS BLOCKED**  

---

## 1. Executive Summary

A comprehensive post-deployment live PostgREST API verification was conducted against the live Supabase environment (`ubphrqumpqdifupwbvpe.supabase.co`) using fresh Firebase ID tokens for the real E2E Collector account (`nirmaltag.e2e.collector@gmail.com`).

The empirical test results demonstrate that **the live API endpoints for project `ubphrqumpqdifupwbvpe` are STILL returning legacy 22P02 invalid UUID syntax errors and PGRST202 missing function errors**.

---

## 2. Empirical Verification Matrix

### A. Real Firebase Authentication
- **Account Email:** `nirmaltag.e2e.collector@gmail.com`
- **Auth Endpoint:** Firebase REST API (`identitytoolkit.googleapis.com`)
- **Status:** **SUCCESS**
- **Token Claims:** `sub = "X6k87mpP00gxkNq8yKn5b8laFvo1"` (28-character string)

### B. Live PostgREST RPC Path Verification
| RPC Function | Parameters | Expected | Live HTTP Status | Error Code | 22P02 / PGRST202 Status |
|---|---|---|---|---|---|
| `get_authenticated_firebase_uid` | `{}` | `"X6k87mpP00gxkNq8yKn5b8laFvo1"` | `HTTP 404` | `PGRST202` | **PGRST202 PRESENT** |
| `get_authenticated_profile_id` | `{}` | `"00000000-0000-4000-a000-000000000096"` | `HTTP 404` | `PGRST202` | **PGRST202 PRESENT** |
| `get_auth_jwt_sub` | `{}` | `"00000000-0000-4000-a000-000000000096"` | `HTTP 400` | `22P02` | **22P02 PRESENT** |
| `has_role` | `{"p_role":"COLLECTOR"}` | `true` | `HTTP 400` | `22P02` | **22P02 PRESENT** |

### C. Live PostgREST Endpoint Verification
| Endpoint | Method | Authorization Header | Live HTTP Status | Error Code | 22P02 Status |
|---|---|---|---|---|---|
| `/rest/v1/profiles` | `GET` | `Bearer <Firebase_ID_Token>` | `HTTP 400` | `22P02` | **PRESENT** |
| `/rest/v1/households` | `GET` | `Bearer <Firebase_ID_Token>` | `HTTP 400` | `22P02` | **PRESENT** |
| `/rest/v1/tags` | `GET` | `Bearer <Firebase_ID_Token>` | `HTTP 400` | `22P02` | **PRESENT** |
| `/rest/v1/collectors` | `GET` | `Bearer <Firebase_ID_Token>` | `HTTP 200` | None (`[0 rows]`) | ABSENT |
| `/rest/v1/user_roles` | `GET` | `Bearer <Firebase_ID_Token>` | `HTTP 200` | None (`[0 rows]`) | ABSENT |

---

## 3. Negative Authorization & Identity Spoofing Audit

- **Unauthenticated Access (`GET /profiles` without Authorization header):** Returns `HTTP 200 OK [0 rows]`.
- **Cross-Profile Query (`GET /profiles?id=neq.collector_id`):** Returns `HTTP 400 22P02`.
- **Cross-Household Query (`GET /households?id=neq.household_id`):** Returns `HTTP 400 22P02`.
- **Role Impersonation via RPC parameter:** `create_tag_batch_and_records` RPC returns `HTTP 400 22P02`.

---

## 4. Side-Effect & Integrity Audit

- **Pickups Executed:** `0`
- **Credit Transactions:** `0`
- **Incentive Transactions:** `0`
- **Active E2E Tag Status:** `ACTIVE` (`00000000-0000-4000-a000-000000000098`, untouched)

Zero unauthorized side effects or mutations occurred.

---

## 5. Diagnostic Finding & Project Owner Troubleshooting Guide

The live API path for project `ubphrqumpqdifupwbvpe` is not serving the updated migration DDL.

### Likely Causes & Verification Checklist:
1. **Wrong Supabase Project Selected in Dashboard:**  
   Ensure you are logged into project **`ubphrqumpqdifupwbvpe`**.  
   Direct Dashboard Link: `https://supabase.com/dashboard/project/ubphrqumpqdifupwbvpe/sql/new`
2. **SQL Execution Not Confirmed:**  
   When pasting [supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql) (all 216 lines) into the SQL Editor, you MUST click the green **Run** button at the bottom right.
3. **Check for Error Output in Results Pane:**  
   Confirm that the results pane at the bottom states:  
   `Success. No rows returned.`  
   If it states an error in red text, the transaction rolled back.
4. **Reload PostgREST Schema Cache:**  
   After running the SQL script successfully, run this query in the SQL Editor:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

---

## 6. Final Verdict

**`LIVE FIREBASE RLS BLOCKED`**
