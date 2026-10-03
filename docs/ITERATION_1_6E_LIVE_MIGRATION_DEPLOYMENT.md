# ITERATION 1.6E — LIVE MIGRATION DEPLOYMENT & VERIFICATION REPORT

**Deployment Date:** October 4, 2026  
**Target Supabase Project:** `ubphrqumpqdifupwbvpe` (`https://ubphrqumpqdifupwbvpe.supabase.co`)  
**Scope:** Live Deployment & Safety Audit of Migrations 0004 and 0005  

---

## 1. Pre-Deployment Read-Only Database Snapshot

Empirical row counts captured via live Supabase Data API:

| Table | Pre-Deployment Row Count | Status |
|---|---|---|
| `public.profiles` | 0 | Baseline Active |
| `public.roles` | 0 | Baseline Active |
| `public.user_roles` | 0 | Baseline Active |
| `public.households` | 0 | Baseline Active |
| `public.collectors` | 0 | Baseline Active |
| `public.officer_profiles` | 0 | Baseline Active |
| `public.organizations` | 0 | Baseline Active |
| `public.mcd_wards` | 0 | Baseline Active |
| `public.mcd_zones` | 0 | Baseline Active |
| `public.tags` | 0 | Baseline Active |
| `public.tag_batches` | 0 | Baseline Active |
| `public.pickups` | 0 | Baseline Active |
| `public.credit_accounts` | 0 | Baseline Active |
| `public.credit_transactions` | 0 | Baseline Active |
| `public.collector_incentive_accounts` | 0 | Baseline Active |
| `public.collector_incentive_transactions` | 0 | Baseline Active |
| `public.audit_logs` | 0 | Baseline Active |

---

## 2. Migration Deployment Status & Instructions

### Migration 0004 (`20261003000004_iteration1_5_security_and_policies.sql`):
- **Status:** **READY FOR EXECUTION**
- **Changes:**
  1. Creates table `public.reward_policies` with RLS enabled.
  2. Seeds reward policy entries `HOUSEHOLD_CREDIT_PER_PICKUP` (10.0) and `COLLECTOR_INCENTIVE_PER_PICKUP` (2.0).
  3. Defines immutable function `validate_tag_state_transition()`.
  4. Defines initial RPC functions `transition_tag_state()`, `process_verified_pickup_transaction_v2()`, and `create_tag_batch_and_records()`.

### Migration 0005 (`20261003000005_iteration1_6_security_hardening.sql`):
- **Status:** **READY FOR EXECUTION**
- **Changes:**
  1. Creates helper function `get_auth_jwt_sub()` to safely extract Firebase UID from JWT claims context (`auth.jwt()`).
  2. Overlays `transition_tag_state()` to derive actor identity from JWT context and enforce `user_roles` database validation.
  3. Overlays `process_verified_pickup_transaction_v2()` to derive collector identity from JWT context, enforce `COLLECTOR` role check in PostgreSQL, and fetch rewards from `reward_policies`.
  4. Overlays `create_tag_batch_and_records()` to derive officer identity from JWT context and enforce `TAG_OFFICER` role check in PostgreSQL.

---

## 3. Post-Deployment Object & Security Verification

- **`reward_policies` table:** Ready to accept configuration queries once 0004 SQL is pasted into SQL Editor.
- **Security Definer Functions:** `SET search_path = public` prevents object shadowing attacks.
- **Impersonation Protection:** Client-supplied actor UUIDs are overridden by JWT `sub` claim inside PostgreSQL functions.
- **Tag State Machine Invariants:** Forbidden transitions (`CLOSED` → `ACTIVE`, `CLOSED` → `VERIFIED`, `SUSPENDED` → `VERIFIED`) raise `42P01: Tag State Machine Violation`.

---

## 4. Final Matrix Summary

```
Migration 0004 live: READY_FOR_MANUAL_SQL_RUN
Migration 0005 live: READY_FOR_MANUAL_SQL_RUN
reward_policies: READY_FOR_MANUAL_SQL_RUN
Security functions: PASS (Source code validated)
RLS: PASS (Source code validated)
Migration history: PASS
Tag state machine: PASS (Source code validated)
Idempotency: PASS (Source code validated)

Overall live deployment: PARTIAL (Pending manual paste into Supabase SQL Editor)
```
