# ITERATION 9.16.6 — FINAL LIVE FIREBASE RLS IDENTITY BRIDGE VERIFICATION

**Date:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Target Migration:** `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql` (Approach B)  
**Target Project:** `ubphrqumpqdifupwbvpe.supabase.co`  
**Status:** **LIVE FIREBASE RLS BLOCKED**  

---

## 1. Executive Summary

Iteration 9.16.6 executed post-deployment live verification following the project owner's notification of executing `supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql` in the Supabase SQL Editor.

Empirical verification was conducted against the live PostgREST API path (`https://ubphrqumpqdifupwbvpe.supabase.co`) using fresh Firebase ID tokens for the real E2E Collector account (`nirmaltag.e2e.collector@gmail.com`).

The live PostgREST API responses demonstrate that **the live database is STILL serving the legacy schema and RLS policies**.

---

## 2. Empirical Test Results

### A. Real Firebase Authentication
- **Account:** `nirmaltag.e2e.collector@gmail.com`
- **Authentication Result:** `SUCCESS` (Firebase Auth REST API)
- **Token Format:** Valid JWT, `sub` claim = 28-character alphanumeric string (`"X6k87mpP00gxkNq8yKn5b8laFvo1"`)

### B. Live RPC Function Verification
| Function | Parameters | Expected | Live Result | Status |
|---|---|---|---|---|
| `get_authenticated_firebase_uid` | `{}` | `"X6k87mpP00gxkNq8yKn5b8laFvo1"` | `HTTP 404 (PGRST202: Function not found in schema cache)` | **FAIL** |
| `get_authenticated_profile_id` | `{}` | `"00000000-0000-4000-a000-000000000096"` | `HTTP 404 (PGRST202: Function not found in schema cache)` | **FAIL** |
| `get_auth_jwt_sub` | `{}` | `"00000000-0000-4000-a000-000000000096"` | `HTTP 400 (22P02: invalid input syntax for type uuid)` | **FAIL** |
| `has_role` | `{"p_role":"COLLECTOR"}` | `true` | `HTTP 400 (22P02: invalid input syntax for type uuid)` | **FAIL** |

### C. PostgREST Endpoint Verification & 22P02 Status
| Endpoint | Method | Header | Response | 22P02 Status | Verdict |
|---|---|---|---|---|---|
| `/rest/v1/profiles` | `GET` | `Authorization: Bearer <Firebase_ID_Token>` | `HTTP 400 (22P02)` | **PRESENT** | **FAIL** |
| `/rest/v1/households` | `GET` | `Authorization: Bearer <Firebase_ID_Token>` | `HTTP 400 (22P02)` | **PRESENT** | **FAIL** |
| `/rest/v1/tags` | `GET` | `Authorization: Bearer <Firebase_ID_Token>` | `HTTP 400 (22P02)` | **PRESENT** | **FAIL** |
| `/rest/v1/collectors` | `GET` | `Authorization: Bearer <Firebase_ID_Token>` | `HTTP 200 [0 rows]` | ABSENT | **UNRESOLVED** |
| `/rest/v1/user_roles` | `GET` | `Authorization: Bearer <Firebase_ID_Token>` | `HTTP 200 [0 rows]` | ABSENT | **UNRESOLVED** |

---

## 3. Negative Authorization & Identity Spoofing Audit

- **Unauthenticated Access (`GET /profiles` without Authorization header):** Returns `HTTP 200 OK [0 rows]`.
- **Cross-Profile / Cross-Household Query:** Throws `HTTP 400 (22P02)` because legacy RLS policies attempt `auth.uid()` UUID casting.
- **Client Parameter Role Impersonation (`create_tag_batch_and_records` RPC with spoofed officer profile ID):** Throws `HTTP 400 (22P02)`.

---

## 4. Side-Effect & Integrity Audit

- **Pickups Executed:** `0`
- **Credit Transactions:** `0`
- **Collector Incentive Transactions:** `0`
- **Active E2E Tag Status:** `ACTIVE` (Untouched, `00000000-0000-4000-a000-000000000098`)

Zero unauthorized mutations occurred during verification.

---

## 5. Technical Diagnosis & Troubleshooting for Project Owner

PostgREST continues to report `PGRST202` (function not found) and PostgreSQL continues to throw `22P02` (invalid UUID syntax).

### Common Root Causes in Supabase SQL Editor:
1. **Unclicked "Run" Button:** The SQL was pasted into a query tab in Supabase SQL Editor, but the **Run** button (or `Ctrl+Enter`) was not clicked.
2. **Multiple Project Orgs:** The query was executed in a different project tab (e.g. staging or local environment) rather than live project `ubphrqumpqdifupwbvpe`.
3. **Transaction Rollback:** If any error occurred during execution (e.g. if the SQL Editor output pane showed a red error message), all statement changes were automatically rolled back.

### Resolution Steps:
1. Navigate to: `https://supabase.com/dashboard/project/ubphrqumpqdifupwbvpe/sql/new`
2. Open [supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261004000009_firebase_uid_rls_identity_bridge.sql).
3. Copy all lines (216 lines) and paste into the new query tab.
4. Click the green **Run** button at the bottom right.
5. Verify that the output panel displays: `Success. No rows returned.`

---

## 6. Final Verdict

**`LIVE FIREBASE RLS BLOCKED`**
