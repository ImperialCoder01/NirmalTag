# NIRMALTAG — ROW LEVEL SECURITY (RLS) & ACCESS CONTROL MATRIX

This security matrix defines table-level authorization and Row Level Security (RLS) enforcement rules across all primary entities in PostgreSQL.

---

## 1. Table Policies Matrix

| Table Name | RLS Status | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Scope Guard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `profiles` | ENABLED | Own profile (`firebase_uid`) OR `SYSTEM_ADMIN` | Authenticated session / Auto-provision | Own profile | Forbidden | `firebase_uid` |
| `user_roles` | ENABLED | Own roles OR `SYSTEM_ADMIN` | `SYSTEM_ADMIN` only | `SYSTEM_ADMIN` only | `SYSTEM_ADMIN` only | `user_id` |
| `households` | ENABLED | Own household record, RWA/BWG Admin in scope, MCD/System Admin | Authenticated Resident / Admin | Own household record | `SYSTEM_ADMIN` only | `user_id`, `rwa_id`, `ward_id` |
| `collectors` | ENABLED | Own collector record, MCD/System Admin | System / Municipal Admin | Own collector record | `SYSTEM_ADMIN` only | `user_id`, `assigned_ward_id` |
| `tags` | ENABLED | Household assigned tags, Collectors, Tag Officers, MCD/System Admin | `TAG_OFFICER`, `SYSTEM_ADMIN` | Server transition function / Tag Officer | Forbidden | `current_assigned_household_id`, `ward_id` |
| `tag_batches` | ENABLED | Tag Officers, MCD/System Admin | `TAG_OFFICER`, `SYSTEM_ADMIN` | `TAG_OFFICER`, `SYSTEM_ADMIN` | `SYSTEM_ADMIN` only | `organization_id`, `ward_id` |
| `pickups` | ENABLED | Assigned Collector, Household, RWA/BWG Admin, MCD/System Admin | `COLLECTOR` with check | Server transition function / MCD Officer | Forbidden | `collector_id`, `household_id`, `ward_id` |
| `credit_accounts` | ENABLED | Assigned Household, MCD/System Admin | Server ledger function | Server ledger function | Forbidden | `household_id` |
| `credit_transactions` | ENABLED | Account Owner, MCD/System Admin | Server ledger function | Immutable (Forbidden) | Immutable (Forbidden) | `account_id` |
| `collector_incentive_accounts` | ENABLED | Assigned Collector, MCD/System Admin | Server ledger function | Server ledger function | Forbidden | `collector_id` |
| `collector_incentive_transactions` | ENABLED | Account Owner, MCD/System Admin | Server ledger function | Immutable (Forbidden) | Immutable (Forbidden) | `account_id` |
| `audit_logs` | ENABLED | `SYSTEM_ADMIN` only | Server audit triggers / API logger | Immutable (Forbidden) | Immutable (Forbidden) | System-wide |

---

## 2. Server API Route Security Pattern

All API endpoints (`/api/v1/*`) verify the caller's Firebase ID token using server-side token validation:
1. Verify token signature against Google OAuth public keys.
2. Extract `firebase_uid`.
3. Query Supabase for authoritative profile, roles, and scope boundaries.
4. Execute operations via atomic PostgreSQL functions (`process_verified_pickup_transaction`, `transition_tag_state`).
