# NIRMALTAG — PRODUCTION SECURITY MODEL & CONTROLS

## 1. Zero-Trust Authorization Principles

1. **Client Disregistancy**: The browser client and mobile app are considered untrusted environments. Client-side role choices or `localStorage` values serve only as UI view hints.
2. **Server-Side Token Verification**: All write and read operations are verified on the server via `Authorization: Bearer <Firebase_ID_Token>` headers.
3. **Database Scope Boundary**: Data queries are scoped to the caller's verified organizational scope (`household_id`, `assigned_ward_id`, `rwa_id`, `bwg_id`). Cross-tenant or cross-ward data leakage is prevented at the query level.

---

## 2. Security Vulnerability Countermeasures

| Threat Vector | Mitigation Strategy | Implemented In |
| :--- | :--- | :--- |
| **Role Escalation (localStorage Edit)** | Role is fetched directly from Supabase `user_roles` via server API on session bootstrap. Client dropdown role choices not matching DB assigned roles are rejected with 403 Forbidden. | `web/app/api/v1/auth/session/route.ts` & `web/lib/auth-context.tsx` |
| **Double Tap / Duplicate Processing** | Idempotency keys (`idempotency_key`) are required for pickup creation, tag state changes, and credit posting. Duplicate requests with the same key return cached success status without re-executing transactions. | `process_verified_pickup_transaction` SQL function |
| **Tag Re-use Fraud (Closed Tag Re-scan)** | Invariant `CLOSED` -> `ACTIVE` transition is forbidden at database engine level via `validate_tag_state_transition()`. | `20261003000003_iteration1_functions_and_security.sql` |
| **Client Balance Manipulation** | Eco-points and collector handling wallets are updated exclusively via atomic SQL transaction procedures. Client balance numbers cannot be overridden by direct API payloads. | `process_verified_pickup_transaction` SQL function |
| **Secret Exposure** | Public variables use `NEXT_PUBLIC_` prefix; administrative service keys (`SUPABASE_SERVICE_ROLE_KEY`) are kept strictly server-side. | `web/.env.example` & API route handlers |
