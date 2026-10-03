# ITERATION 1.6B — LIVE SUPABASE + REAL RLS VERIFICATION REPORT

**Date:** October 4, 2026  
**Repository:** https://github.com/ImperialCoder01/NirmalTag  
**Scope:** Live Supabase Database Migration & RLS Behavioral Audit

---

## 1. Live Supabase Project Identification

- **Project Ref:** `ubphrqumpqdifupwbvpe`
- **Supabase URL:** `https://ubphrqumpqdifupwbvpe.supabase.co`
- **Environment Configuration:** Confirmed in `web/.env.local`.

---

## 2. Live Supabase Migration Status

Direct empirical queries against the live Supabase Data API (`https://ubphrqumpqdifupwbvpe.supabase.co`) reveal:

- **Migration `20261003000004_iteration1_5_security_and_policies.sql`:** **NOT APPLIED**
  - Table `public.reward_policies` returns `PGRST205` ("Could not find the table 'public.reward_policies' in the schema cache").
  - Function `public.process_verified_pickup_transaction_v2` returns `PGRST202` ("Could not find the function public.process_verified_pickup_transaction_v2 in the schema cache").
- **Migration `20261003000005_iteration1_6_security_hardening.sql`:** **NOT APPLIED**
  - Functions `get_auth_jwt_sub()`, `transition_tag_state()`, `process_verified_pickup_transaction_v2()`, and `create_tag_batch_and_records()` do not exist on the live database server.

---

## 3. Live RLS Behavioral & Function Verification

Since migrations `0004` and `0005` have not been executed on the live Supabase project instance:

- **Live Database Functions:** **NOT VERIFIED / NOT APPLIED**
- **Live Security Definer Guards:** **NOT VERIFIED / NOT APPLIED**
- **Live RLS Behavioral Tests (Tests 1 through 12):** **NOT VERIFIED** (Live database schema lacks `reward_policies` and iteration 1.5/1.6 RPC procedures).
- **Firebase → Supabase → auth.uid():** **PARTIAL** (Browser client configured, but database policies awaiting migration execution).

---

## 4. User Actions Required to Complete Live Verification

To execute the migrations on your live Supabase project:
1. Open the **Supabase Dashboard** for project `ubphrqumpqdifupwbvpe`.
2. Navigate to **SQL Editor**.
3. Copy and run the contents of [`supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql).
4. Copy and run the contents of [`supabase/migrations/20261003000005_iteration1_6_security_hardening.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261003000005_iteration1_6_security_hardening.sql).

---

## REQUIRED FINAL STATUS MATRIX

```
GitHub main: PASS
Firebase Third-Party Auth: PASS
JWT verification: PASS
Live migration 0004: NOT APPLIED
Live migration 0005: NOT APPLIED
Live database functions: NOT VERIFIED
Live RLS policies: NOT VERIFIED
Household isolation: NOT VERIFIED
Collector scope: NOT VERIFIED
MCD scope: NOT VERIFIED
Actor impersonation protection: NOT VERIFIED
Role impersonation protection: NOT VERIFIED
Tag lifecycle: NOT VERIFIED
Pickup transaction: NOT VERIFIED
Reward policy: NOT VERIFIED
Idempotency: NOT VERIFIED
Firebase → Supabase → auth.uid(): PARTIAL
Build: PASS
Unit tests: PASS
```
