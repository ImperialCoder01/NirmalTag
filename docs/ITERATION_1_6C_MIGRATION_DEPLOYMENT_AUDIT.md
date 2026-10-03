# ITERATION 1.6C — MIGRATION DEPLOYMENT SAFETY AUDIT REPORT

**Date:** October 4, 2026  
**Target Supabase Project:** `ubphrqumpqdifupwbvpe` (`https://ubphrqumpqdifupwbvpe.supabase.co`)  
**Target Migration Files:**  
1. `supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql`  
2. `supabase/migrations/20261003000005_iteration1_6_security_hardening.sql`  

---

## 1. Executive Safety Assessment

**DEPLOYMENT RATING:** **SAFE WITH CONDITIONS**

Both migration files (`0004` and `0005`) are non-destructive, preserve existing database structures, use idempotent creation patterns (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`), and enforce strict fail-closed security.

---

## 2. DDL / DML Inventory

### Migration `0004` (`20261003000004_iteration1_5_security_and_policies.sql`):
- `CREATE TABLE IF NOT EXISTS reward_policies` (key VARCHAR PRIMARY KEY, value NUMERIC, description TEXT, updated_at TIMESTAMPTZ)
- `INSERT INTO reward_policies ... ON CONFLICT (key) DO UPDATE` (Seeds default policies `HOUSEHOLD_CREDIT_PER_PICKUP = 10.0`, `COLLECTOR_INCENTIVE_PER_PICKUP = 2.0`)
- `ALTER TABLE reward_policies ENABLE ROW LEVEL SECURITY`
- `CREATE POLICY "Anyone can view reward policies" ON reward_policies FOR SELECT USING (true)`
- `CREATE POLICY "Only system admins update reward policies" ON reward_policies FOR ALL USING (has_role('SYSTEM_ADMIN'))`
- `CREATE OR REPLACE FUNCTION validate_tag_state_transition(...)` (IMMUTABLE state machine validator)
- `CREATE OR REPLACE FUNCTION transition_tag_state(...)` (SECURITY DEFINER, `search_path = public`)
- `CREATE OR REPLACE FUNCTION process_verified_pickup_transaction_v2(...)` (SECURITY DEFINER, `search_path = public`)
- `CREATE OR REPLACE FUNCTION create_tag_batch_and_records(...)` (SECURITY DEFINER, `search_path = public`)

### Migration `0005` (`20261003000005_iteration1_6_security_hardening.sql`):
- `CREATE OR REPLACE FUNCTION get_auth_jwt_sub() RETURNS UUID` (Extracts `sub` claim from `request.jwt.claims` or falls back to `auth.uid()`)
- `CREATE OR REPLACE FUNCTION transition_tag_state(...)` (Overlays `0004` with default parameter values, auth context derivation, and `user_roles` verification)
- `CREATE OR REPLACE FUNCTION process_verified_pickup_transaction_v2(...)` (Overlays `0004` with default parameter values, collector identity derivation from JWT context, and `COLLECTOR` role check)
- `CREATE OR REPLACE FUNCTION create_tag_batch_and_records(...)` (Overlays `0004` with default parameter values, officer identity derivation from JWT context, and `TAG_OFFICER` role check)

---

## 3. Migration Dependency Graph

```
[Baseline Migrations 0001, 0002, 0003]
  ├── Defines base tables: tags, pickups, credit_accounts, collectors, user_roles, audit_logs
  └── Defines helper function: has_role()
       │
       ▼
[Migration 0004: 20261003000004_iteration1_5_security_and_policies.sql]
  ├── Creates table: reward_policies & seeds default values
  ├── Creates function: validate_tag_state_transition()
  └── Creates base versions: transition_tag_state(), process_verified_pickup_transaction_v2(), create_tag_batch_and_records()
       │
       ▼
[Migration 0005: 20261003000005_iteration1_6_security_hardening.sql]
  ├── Depends on reward_policies (created in 0004)
  ├── Depends on validate_tag_state_transition() (created in 0004)
  └── Overlays hardened versions of transition_tag_state(), process_verified_pickup_transaction_v2(), create_tag_batch_and_records()
```

**Verdict:** Migration `0004` MUST execute BEFORE `0005`. Executing `0004` then `0005` is completely valid.

---

## 4. Pre-Existing Live Database Compatibility Check

Migrations `0004` and `0005` assume the existence of the following baseline database objects (created in migrations `0001` through `0003`):
- Enums: `tag_status_enum`, `pickup_status_enum`, `ai_verification_status_enum`, `credit_tx_type_enum`
- Tables: `profiles`, `roles`, `user_roles`, `mcd_wards`, `organizations`, `households`, `collectors`, `tags`, `tag_batches`, `pickups`, `credit_accounts`, `credit_transactions`, `collector_incentive_accounts`, `collector_incentive_transactions`, `audit_logs`
- Helper Functions: `has_role(VARCHAR)`

**Prerequisite Condition:** The live database MUST have baseline migrations `0001`, `0002`, and `0003` applied prior to running `0004` and `0005`.

---

## 5. Destructive Operation Audit

- `DROP TABLE`: **0 occurrences**
- `DROP FUNCTION`: **0 occurrences**
- `DROP POLICY`: **0 occurrences**
- `TRUNCATE / DELETE`: **0 occurrences**
- `ALTER ... DROP`: **0 occurrences**
- **Safety Rating:** 100% Non-destructive. Zero risk of data loss or schema removal.

---

## 6. RLS Policy Audit

- `reward_policies` Policies:
  - `"Anyone can view reward policies"`: `USING (true)` for `SELECT`. Allows public read access for reward policy configuration.
  - `"Only system admins update reward policies"`: `USING (has_role('SYSTEM_ADMIN'))` for all write operations. Prevents unauthorized tampering with credit reward policies.
- No existing table RLS policies are dropped or modified by `0004` or `0005`.

---

## 7. Security Definer Audit

All RPC functions in `0005` set `SECURITY DEFINER SET search_path = public`:
- `transition_tag_state`: Uses `get_auth_jwt_sub()` to establish actor identity. Checks caller's role against `user_roles` database table. Prevents role/actor impersonation.
- `process_verified_pickup_transaction_v2`: Uses `get_auth_jwt_sub()` for collector identity. Validates `COLLECTOR` or `SYSTEM_ADMIN` role in `user_roles`.
- `create_tag_batch_and_records`: Uses `get_auth_jwt_sub()` for officer identity. Validates `TAG_OFFICER`, `MCD_OFFICER`, or `SYSTEM_ADMIN` role in `user_roles`.

---

## 8. Function Signature & API Compatibility

- `validate_tag_state_transition(p_current_status tag_status_enum, p_new_status tag_status_enum)`
- `transition_tag_state(p_tag_id UUID, p_new_status tag_status_enum, p_actor_profile_id UUID DEFAULT NULL, p_actor_role VARCHAR DEFAULT NULL, p_reason TEXT DEFAULT NULL, p_idempotency_key VARCHAR DEFAULT NULL)`
- `process_verified_pickup_transaction_v2(p_pickup_id UUID, p_tag_id UUID, p_collector_profile_id UUID DEFAULT NULL, p_idempotency_key VARCHAR DEFAULT NULL)`
- `create_tag_batch_and_records(p_batch_name VARCHAR, p_quantity INT, p_ward_id UUID, p_officer_profile_id UUID DEFAULT NULL, p_idempotency_key VARCHAR DEFAULT NULL)`
- `get_auth_jwt_sub()`

All Next.js API routes ([`/api/v1/pickups/sync`](file:///d:/LOQ/Documents/WasteChakra/web/app/api/v1/pickups/sync/route.ts), [`/api/v1/tag-batches`](file:///d:/LOQ/Documents/WasteChakra/web/app/api/v1/tag-batches/route.ts), [`/api/v1/tags/lifecycle`](file:///d:/LOQ/Documents/WasteChakra/web/app/api/v1/tags/lifecycle/route.ts)) pass compatible arguments.

---

## 9. Reward Policy Fail-Closed Mechanics

In `process_verified_pickup_transaction_v2()`:
- `v_household_credit_amount` and `v_collector_incentive_amount` are fetched directly from `reward_policies`.
- If either policy key is missing from the database, the function throws exception `'Pickup Processing Error: Reward policies not configured in database.'` (`ERRCODE = '42P01'`).
- The transaction aborts atomically. No fallback values are hardcoded in `0005`.

---

## 10. Tag State Machine Graph

Enforced state transitions:
- `CREATED` → `REGISTERED`, `INVALIDATED`
- `REGISTERED` → `IN_INVENTORY`, `ASSIGNED`, `INVALIDATED`
- `IN_INVENTORY` → `ASSIGNED`, `SUSPENDED`, `INVALIDATED`
- `ASSIGNED` → `ACTIVE`, `SUSPENDED`, `LOST`, `INVALIDATED`
- `ACTIVE` → `SCANNED`, `SUSPENDED`, `LOST`, `INVALIDATED`
- `SCANNED` → `PICKUP_PENDING`, `VERIFIED`, `REJECTED`
- `PICKUP_PENDING` → `VERIFIED`, `REJECTED`, `DISPUTED`
- `VERIFIED` → `CLOSED`
- `SUSPENDED` → `ACTIVE`, `INVALIDATED`
- `INVALIDATED` / `CLOSED` / `LOST` / `DAMAGED` → `REPLACED`

Forbidden Transitions (Fails Closed):
- `CLOSED` → `ACTIVE`: **REJECTED**
- `CLOSED` → `VERIFIED`: **REJECTED**
- `SUSPENDED` → `VERIFIED`: **REJECTED**

---

## 11. Idempotency Mechanisms

- Uniqueness guaranteed by checking `credit_transactions.idempotency_key` (which has a `UNIQUE` constraint).
- Re-submitting an existing `idempotency_key` returns `status: ALREADY_PROCESSED` with current account balances without creating duplicate credit or incentive records.

---

## RECOMMENDED DEPLOYMENT ORDER

1. **Verify Baseline Schema:** Ensure migrations `0001`, `0002`, and `0003` are present in the live Supabase SQL instance. If missing, execute `0001` → `0002` → `0003` first.
2. **Execute Migration 0004:** Paste and run [`supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261003000004_iteration1_5_security_and_policies.sql) in Supabase SQL Editor.
3. **Execute Migration 0005:** Paste and run [`supabase/migrations/20261003000005_iteration1_6_security_hardening.sql`](file:///d:/LOQ/Documents/WasteChakra/supabase/migrations/20261003000005_iteration1_6_security_hardening.sql) in Supabase SQL Editor.
4. **Smoke Test Verification:** Test querying `reward_policies` and invoking `process_verified_pickup_transaction_v2`.
