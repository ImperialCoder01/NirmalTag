# NIRMALTAG — ITERATION 1 BASELINE REPORT

**Date**: October 3, 2026  
**Git Branch**: `main`  
**Git Commit**: `95ecb64`  
**Repository**: `https://github.com/ImperialCoder01/NirmalTag.git`

---

## 1. Executive Summary

This baseline report captures the state of the NirmalTag codebase prior to executing Iteration 1 (Production Recovery).

### Current Status Matrix
- **Identity Provider**: Firebase Authentication (Active on Web and Android via SDKs).
- **Backend Database**: Supabase PostgreSQL (`https://ubphrqumpqdifupwbvpe.supabase.co`).
- **Authentication Bridge**: **MISSING**. Client queries Supabase using the `anon` key without Firebase ID token exchange; `auth.uid()` evaluates to `NULL` in RLS policies.
- **Authorization**: **CLIENT-ONLY / INSECURE**. Web components determine authorization using `localStorage.getItem("nirmaltag_user_role")`.
- **Database Operations**: **PARTIAL / DEMO**. Tables exist in SQL migrations (`20261003000001_initial_nirmaltag_schema.sql`), but frontend screens update local component state instead of querying PostgREST.
- **API Endpoints**: **SKELETON**. `web/app/api/v1/pickups/sync/route.ts` and `web/app/api/v1/tag-batches/route.ts` return static mock responses.

---

## 2. Inventory of Files & Components to be Modified in Iteration 1

### Core Web & Auth Files
- `web/lib/auth-context.tsx`: Replace `localStorage` role state with DB-backed profile/role resolution from Supabase `user_roles`.
- `web/lib/supabase.ts`: Configure server and authenticated Supabase client instances.
- `web/app/login/page.tsx`: Update login UI to authenticate first, then resolve authorized roles.
- `web/app/register/page.tsx`: Integrate DB-backed account & profile provisioning.
- `web/components/Navbar.tsx`: Update role switcher to list ONLY roles assigned to the user's account in PostgreSQL.

### Core API Routes to be Created / Upgraded
- `web/app/api/v1/auth/session/route.ts`: Server-side endpoint to verify Firebase ID tokens and return authoritative Supabase user profile, roles, and scope.
- `web/app/api/v1/pickups/sync/route.ts`: Production endpoint for atomic pickup creation, AI verification recording, tag state closure, and credit/incentive posting.
- `web/app/api/v1/tag-batches/route.ts`: Production endpoint for tag batch creation, serial generation, tag assignment, and activation.
- `web/app/api/v1/tags/lifecycle/route.ts`: Centralized tag state machine transition endpoint enforcing invariant transitions (e.g. `CLOSED` -> `ACTIVE` forbidden).

### Core Role Portal Pages to be Connected
- `web/app/household/page.tsx`: Connect to Supabase `households`, `tags`, `credit_accounts`, `credit_transactions`.
- `web/app/collector/page.tsx`: Connect to Supabase `collectors`, `pickups`, `collector_incentive_accounts`.
- `web/app/tag-officer/page.tsx`: Connect to Supabase `tag_batches`, `tags`, `tag_assignments`.
- `web/app/rwa/page.tsx`: Connect to Supabase `organizations`, `households`, `pickups`.
- `web/app/bwg/page.tsx`: Connect to Supabase `organizations`, `pickups`, `audit_logs`.
- `web/app/mcd/page.tsx`: Connect to Supabase `wards`, `pickups`, `ai_verifications`.
- `web/app/admin/page.tsx`: Connect to Supabase `user_roles`, `audit_logs`.

### Mobile Application Files to be Modified
- `android/app/src/main/java/com/nirmaltag/app/MainActivity.kt`: Update auth state handling to read server-backed profile roles and align with API backend endpoints.

### SQL Database Migrations to be Added
- `supabase/migrations/20261003000003_iteration1_functions_and_security.sql`: Database functions for JWT claim verification, tag state transition enforcement, double-entry credit ledger posting, and audit logging.

### Documentation Files to be Added
- `docs/AUTH_ARCHITECTURE.md`
- `docs/RLS_SECURITY_MATRIX.md`
- `docs/TAG_STATE_MACHINE.md`
- `docs/API_REFERENCE.md`
- `docs/SECURITY_MODEL.md`
- `docs/ITERATION_1_COMPLETION_REPORT.md`

---

## 3. Security Risk Baseline

| Risk Area | Current Vulnerability Level | Baseline Condition |
| :--- | :--- | :--- |
| **Role Escalation** | **CRITICAL** | Any client can write `localStorage.setItem("nirmaltag_user_role", "SYSTEM_ADMIN")` to access admin views. |
| **RLS Denial / Bypass** | **HIGH** | Supabase RLS expects `auth.uid()`, which is null without Supabase session JWTs. |
| **Tag State Manipulation** | **HIGH** | Client UI can mark tags as verified/closed without server state machine validation. |
| **Credit Fraud** | **HIGH** | Wallet balances are incremented in local React/Compose state without immutable ledger transactions. |
| **Secret Exposure** | **LOW** | Client codebase properly redacts secret keys (`SUPABASE_SERVICE_ROLE_KEY` is not exposed in public client bundles). |
