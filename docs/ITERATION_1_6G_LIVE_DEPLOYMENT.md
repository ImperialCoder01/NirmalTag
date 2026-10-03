# ITERATION 1.6G — AUTOMATED LIVE SUPABASE MIGRATION DEPLOYMENT REPORT

**Date:** October 4, 2026  
**Target Supabase Project:** `ubphrqumpqdifupwbvpe` (`https://ubphrqumpqdifupwbvpe.supabase.co`)  
**Repository:** https://github.com/ImperialCoder01/NirmalTag  

---

## 1. Supabase CLI & API Access Authentication Check

- **Project Ref:** `ubphrqumpqdifupwbvpe`
- **CLI Project Link Attempt:**
  ```
  npx supabase link --project-ref ubphrqumpqdifupwbvpe
  Error: LegacyLinkProjectStatusError: Your account does not have the necessary privileges to access this endpoint.
  ```
- **Management API Query Attempt:**
  - Automated script `scripts/apply_migrations.mjs` checks `process.env.SUPABASE_ACCESS_TOKEN`.
  - Result: `SUPABASE_ACCESS_TOKEN` environment variable is not populated in the current execution shell environment.
  - The CLI's cached access token belongs to a different Supabase organization (`xmilyewfnznsfpiaxmzy`) that does not own project `ubphrqumpqdifupwbvpe`.

---

## 2. Required Access Token / Permission

To allow automated CLI / API deployment of migrations `0004` and `0005` to project `ubphrqumpqdifupwbvpe`:
1. Provide a **Supabase Personal Access Token (sbp_...)** created from Supabase Account Settings -> Access Tokens for the account owning project `ubphrqumpqdifupwbvpe`.
2. Set the environment variable:
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN="sbp_your_token_here"
   ```
   Or execute `npx supabase login --token sbp_your_token_here`.

---

## 3. Migration Files Audit & Verification Status

The migration files on `origin/main` remain verified and ready for deployment:
1. `supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql` (Creates `reward_policies` table and base state functions)
2. `supabase/migrations/20261003000005_iteration1_6_security_hardening.sql` (Applies `get_auth_jwt_sub()` auth context hardening)

---

## 4. FINAL STATUS MATRIX

```
Supabase project verification: BLOCKED_BY_ACCESS_TOKEN
0004 deployment: NOT APPLIED
0005 deployment: NOT APPLIED
reward_policies: NOT APPLIED
security functions: NOT APPLIED
RLS: NOT VERIFIED
actor authorization: NOT VERIFIED
role authorization: NOT VERIFIED
scope authorization: NOT VERIFIED
tag lifecycle: NOT VERIFIED
pickup transaction: NOT VERIFIED
reward ledger: NOT VERIFIED
idempotency: NOT VERIFIED
Firebase → Supabase → auth.uid(): PARTIAL
migration history: NOT APPLIED

Overall live deployment: BLOCKED_BY_ACCESS_TOKEN
```
