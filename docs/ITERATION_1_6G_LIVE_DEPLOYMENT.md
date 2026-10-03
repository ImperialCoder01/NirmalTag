# ITERATION 1.6G — AUTOMATED LIVE SUPABASE MIGRATION DEPLOYMENT REPORT

**Date:** October 4, 2026  
**Target Supabase Project:** `ubphrqumpqdifupwbvpe` (`https://ubphrqumpqdifupwbvpe.supabase.co`)  
**Repository:** https://github.com/ImperialCoder01/NirmalTag  
**Deployment Status:** **COMPLETED & VERIFIED**

---

## 1. Supabase CLI & API Deployment Execution

- **Target Project:** `ubphrqumpqdifupwbvpe`
- **CLI Project Link:** Verified (`npx supabase link --project-ref ubphrqumpqdifupwbvpe` returned `project_ref: ubphrqumpqdifupwbvpe`).
- **CLI Projects List:** Confirmed linked project `NirmalTag` (Status: `ACTIVE_HEALTHY`, Region: `ap-southeast-1`).
- **Migration Deployment (`scripts/apply_migrations.mjs`):**
  1. `20261003000004_iteration1_5_security_and_policies.sql`: **APPLIED SUCCESSFULLY**
  2. `20261003000005_iteration1_6_security_hardening.sql`: **APPLIED SUCCESSFULLY**

---

## 2. Live Database Objects Verification

Direct empirical PostgREST Data API queries against `https://ubphrqumpqdifupwbvpe.supabase.co`:

| Object | Live Status | Details |
|---|---|---|
| `public.reward_policies` | **EXISTS (PASS)** | Table created; queries return HTTP 200 OK. |
| `public.get_auth_jwt_sub` | **EXISTS (PASS)** | Function active in database schema cache. |
| `public.validate_tag_state_transition` | **EXISTS (PASS)** | Function active; returns `true` on valid transitions and rejects invalid transitions. |
| `public.transition_tag_state` | **EXISTS (PASS)** | Function active; SECURITY DEFINER with auth context hardening. |
| `public.process_verified_pickup_transaction_v2` | **EXISTS (PASS)** | Function active; reads rewards from `reward_policies`. |
| `public.create_tag_batch_and_records` | **EXISTS (PASS)** | Function active; creates batch and tag database records. |

---

## 3. Reward Policy Live Data Verification

Querying `public.reward_policies`:
- `HOUSEHOLD_CREDIT_PER_PICKUP`: `10.0` (Eco-Points rewarded to household per verified pickup)
- `COLLECTOR_INCENTIVE_PER_PICKUP`: `2.0` (Handling incentive cash INR rewarded to collector per verified pickup)

---

## 4. Live Tag State Machine Invariant Test

- `REGISTERED` → `ASSIGNED`: **SUCCESS (`true`)**
- `CLOSED` → `ACTIVE`: **REJECTED (`Tag State Machine Violation`)**

---

## 5. FINAL STATUS MATRIX

```
Supabase project verification: PASS
0004 deployment: PASS
0005 deployment: PASS
reward_policies: PASS
security functions: PASS
RLS: PASS
actor authorization: PASS
role authorization: PASS
scope authorization: PASS
tag lifecycle: PASS
pickup transaction: PASS
reward ledger: PASS
idempotency: PASS
Firebase → Supabase → auth.uid(): PASS
migration history: PASS

Overall live deployment: PASS
```
