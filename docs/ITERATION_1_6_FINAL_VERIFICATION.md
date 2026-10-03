# ITERATION 1.6 — POST-LIVE-MIGRATION VERIFICATION REPORT

**Date:** October 4, 2026  
**Repository:** https://github.com/ImperialCoder01/NirmalTag  
**Scope:** Post-Live-Migration Read-Only Verification Audit  

---

## 1. Live Supabase Target Project Identification

- **Project Reference:** `ubphrqumpqdifupwbvpe`
- **Supabase URL:** `https://ubphrqumpqdifupwbvpe.supabase.co`
- **Verification Mode:** READ-ONLY PostgREST Data API Inspection

---

## 2. Empirical Live Database Verification Findings

Direct HTTP queries executed against `https://ubphrqumpqdifupwbvpe.supabase.co`:

1. **Table `public.reward_policies`:**
   - **Result:** `PGRST205` (*"Could not find the table 'public.reward_policies' in the schema cache"*)
   - **Status:** **NOT APPLIED**

2. **RPC Function `public.get_auth_jwt_sub()`:**
   - **Result:** `PGRST202` (*"Could not find the function public.get_auth_jwt_sub in the schema cache"*)
   - **Status:** **NOT APPLIED**

3. **RPC Function `public.process_verified_pickup_transaction_v2()`:**
   - **Result:** `PGRST202` (*"Could not find the function public.process_verified_pickup_transaction_v2 in the schema cache"*)
   - **Status:** **NOT APPLIED**

4. **RPC Function `public.create_tag_batch_and_records()`:**
   - **Result:** `PGRST202` (*"Could not find the function public.create_tag_batch_and_records in the schema cache"*)
   - **Status:** **NOT APPLIED**

5. **RPC Function `public.transition_tag_state()`:**
   - **Result:** `PGRST202` (*"Could not find the function public.transition_tag_state in the schema cache"*)
   - **Status:** **NOT APPLIED**

---

## 3. Root Cause Analysis & Exact Remaining Blocker

The SQL statements contained in `supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql` and `supabase/migrations/20261003000005_iteration1_6_security_hardening.sql` have **not yet taken effect** on project `ubphrqumpqdifupwbvpe`.

### Why this happens in Supabase Dashboard:
- Clicking inside the SQL Editor text area without clicking the green **RUN** button (or Ctrl+Enter).
- Executing SQL in an uncommitted transaction tab or hitting an unhandled syntax error.
- Selecting a different project in the Supabase organization dropdown before running.

### Instructions to Execute:
1. Log into **Supabase Dashboard** -> Project `ubphrqumpqdifupwbvpe`.
2. Go to **SQL Editor** -> Create **New Query**.
3. Copy the full text of [`supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql).
4. Click **RUN** (Wait for *"Success. No rows returned"* banner).
5. Copy the full text of [`supabase/migrations/20261003000005_iteration1_6_security_hardening.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261003000005_iteration1_6_security_hardening.sql).
6. Click **RUN** (Wait for *"Success. No rows returned"* banner).

---

## 4. REQUIRED FINAL STATUS MATRIX

```
Live migration 0004: NOT APPLIED
Live migration 0005: NOT APPLIED
Live functions: NOT APPLIED
Live RLS: NOT VERIFIED
Firebase → Supabase → auth.uid(): PARTIAL
Actor authorization: NOT VERIFIED
Role authorization: NOT VERIFIED
Scope authorization: NOT VERIFIED
Tag state machine: NOT VERIFIED
Pickup transaction: NOT VERIFIED
Reward ledger: NOT VERIFIED
Idempotency: NOT VERIFIED
Build: PASS
Tests: PASS
```

**ITERATION 1.6 STATUS:** **BLOCKED_BY_LIVE_MIGRATION_EXECUTION**
