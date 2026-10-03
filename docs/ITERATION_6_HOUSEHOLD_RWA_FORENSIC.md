# NIRMALTAG — ITERATION 6: HOUSEHOLD ASSIGNMENT & RWA WORKFLOW FORENSIC BASELINE

**Document Status**: AUTHORITATIVE BASELINE AUDIT  
**Date**: October 4, 2026  
**Scope**: Household Profile & Tag Ownership, RWA Scope Rules, Tag Assignment Procedure, State Machine Transitions, RLS Policies, Credit Ledger  
**Live Target**: Supabase Project `ubphrqumpqdifupwbvpe` (`https://ubphrqumpqdifupwbvpe.supabase.co`)

---

## 1. Executive Summary & Forensic Scope

Iteration 6 establishes authoritative, database-backed household tag ownership, RWA organizational scoping, and resident portal capabilities. Prior iterations established Tag Officer batch generation and Collector pickup verification. Iteration 6 ensures:
1. **Ownership Authority**: Tag-to-household assignment is 100% database-backed via `tags.current_assigned_household_id` and PostgreSQL procedure `assign_tag_to_household()`.
2. **Reassignment Protection**: Re-assigning a tag already owned by Household A to Household B is strictly **REJECTED** (Fail Closed).
3. **Closed Tag Invariant**: `CLOSED` tags cannot be assigned, re-assigned, or activated.
4. **Household Data Isolation**: RLS policies restrict Household residents to viewing only their own assigned tags, pickup history, and ledger credits.
5. **RWA Scope Isolation**: RWA Administrators can view only households and compliance metrics scoped to their assigned RWA organization (`households.org_id = rwa.org_id`).
6. **Zero Client Authority**: All credit rewards and pickup status changes come from server-side database procedures.

---

## 2. Forensic Audit of Database Tables & Relationships

### 2.1 Ownership Schema Analysis
| Table | Key Column | Foreign Key Target | Authoritative Role |
|---|---|---|---|
| `public.households` | `user_id` | `profiles.id` | Binds household profile to authenticated identity (`auth.uid()`) |
| `public.households` | `org_id` | `organizations.id` | Scopes household to specific RWA or BWG organization |
| `public.tags` | `current_assigned_household_id` | `households.id` | **Single Source of Truth for Tag Ownership** |
| `public.tag_assignments` | `tag_id`, `household_id` | `tags`, `households` | Historical audit record of assignment event |
| `public.credit_accounts` | `household_id` | `households.id` | Immutable balance ledger for eco-credits |
| `public.credit_transactions` | `account_id`, `pickup_id` | `credit_accounts`, `pickups` | Audit line items for credit earnings and redemptions |

---

## 3. Required Implementation Plan for Iteration 6

### 3.1 Migration 0007 (`supabase/migrations/20261003000007_iteration6_household_rwa_ownership.sql`)
1. **Procedure `assign_tag_to_household(p_tag_id, p_household_id, p_idempotency_key)`**:
   - SECURITY DEFINER function with `SET search_path = public`.
   - Validates `get_auth_jwt_sub()` caller identity and role `TAG_OFFICER` or `SYSTEM_ADMIN`.
   - Checks tag existence and status (`CREATED`, `REGISTERED`, `IN_INVENTORY`).
   - If tag status is `CLOSED`, `INVALIDATED`, `DAMAGED`, or `LOST` $\to$ **REJECT** (`Tag State Machine Violation`).
   - If tag is already assigned to another household $\to$ **REJECT** (`Tag Ownership Conflict`).
   - Idempotent retry check $\to$ returns success if already assigned to requested household under same idempotency key.
   - Updates `tags.current_assigned_household_id = p_household_id` and `tags.status = 'ASSIGNED'`.
   - Inserts record into `tag_assignments` and immutable `audit_logs` entry `'TAG_ASSIGNED_TO_HOUSEHOLD'`.

2. **Procedure `activate_household_tag(p_tag_id, p_idempotency_key)`**:
   - Resolves authenticated household identity (`user_id = get_auth_jwt_sub()`).
   - Verifies `tag.current_assigned_household_id == household_id`.
   - Verifies tag status is `ASSIGNED`.
   - Transitions tag status to `'ACTIVE'::tag_status_enum` and records `activated_at = NOW()`.
   - Inserts audit log entry `'TAG_ACTIVATED_BY_HOUSEHOLD'`.

3. **RLS Policy Enforcement**:
   - Household Policy: `SELECT` on `tags` allowed ONLY where `current_assigned_household_id` matches user's household.
   - RWA Policy: `SELECT` on `households` and `tags` allowed ONLY where `households.org_id` matches user's RWA org.

---

## 4. UI Refactoring Requirements

1. **`/household` (`web/app/household/page.tsx`)**:
   - Remove mock credit balance (140 Pts), mock tag arrays, and hardcoded pickup history.
   - Fetch real assigned tags via `/api/v1/household/tags`.
   - Fetch real credit balance and ledger history via `/api/v1/household/credits`.
   - Wire tag activation form to `/api/v1/household/activate-tag`.
2. **`/rwa` (`web/app/rwa/page.tsx`)**:
   - Remove mock household arrays and hardcoded KPI statistics.
   - Fetch real scoped household directory via `/api/v1/rwa/households`.
   - Display database-derived active tag counts and compliance metrics.
   - Mark non-implemented features (e.g. unbacked leaderboard algorithms) explicitly as `NOT IMPLEMENTED`.
