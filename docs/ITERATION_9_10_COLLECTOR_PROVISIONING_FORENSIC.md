# ITERATION 9.10 — COLLECTOR PROVISIONING FORENSIC AUDIT

## Executive Overview
This document details the forensic audit of user profile creation, role mapping (`COLLECTOR`), organization/ward binding, and tag supply chain provisioning in the NirmalTag PostgreSQL database (`ubphrqumpqdifupwbvpe`).

---

## 1. Forensic Schema & Lifecycle Inspection

### A. Profiles & Role Assignment Lifecycle
- **Table**: `public.profiles` (`id UUID PRIMARY KEY`, `firebase_uid VARCHAR(128) UNIQUE NOT NULL`, `email VARCHAR(255)`, `full_name VARCHAR(255)`).
- **Role Invariant**: `user_roles` links `user_id` (UUID referencing `profiles.id`) to `role_id` (UUID referencing `roles.id` where `name = 'COLLECTOR'`).
- **Authorization Enforcement**: Security-Definer RPCs (`process_verified_pickup_transaction_v2`, `create_tag_batch_and_records`, `assign_tag_to_household`) extract `auth.uid()` and enforce role checks via:
  ```sql
  SELECT EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = v_effective_collector_uid
        AND r.name IN ('COLLECTOR', 'SYSTEM_ADMIN')
  );
  ```

### B. Collector Entity & Ward Relationship
- **Table**: `public.collectors` (`id UUID PRIMARY KEY`, `user_id UUID REFERENCES profiles(id)`, `org_id UUID REFERENCES organizations(id)`, `assigned_ward_id UUID REFERENCES mcd_wards(id)`).
- **Ward Scope**: Linked to MCD Ward 42 (`mcd_wards.ward_code = 'WARD_42'`).

### C. Household & Tag Fixture Requirements
- **Household Entity**: `public.households` (`id UUID PRIMARY KEY`, `user_id UUID REFERENCES profiles(id)`, `org_id UUID REFERENCES organizations(id)`, `ward_id UUID REFERENCES mcd_wards(id)`).
- **Authoritative Tag Provisioning**:
  1. `create_tag_batch_and_records(p_batch_name, p_quantity, p_ward_id, p_officer_profile_id, p_idempotency_key)`: Generates tag record with serial from sequence `tag_serial_seq` in `CREATED` state.
  2. `assign_tag_to_household(p_tag_id, p_household_id, p_officer_profile_id, p_idempotency_key)`: Transitions tag state `REGISTERED` $\to$ `ASSIGNED`.
  3. `activate_household_tag(p_tag_id, p_household_profile_id, p_idempotency_key)`: Transitions tag state `ASSIGNED` $\to$ `ACTIVE`.

---

## 2. Answers to Governance Questions

1. **Who is allowed to create profiles?**
   System onboarding routines and authenticated users managing their own identity (`firebase_uid = auth.uid()::text`).
2. **Who is allowed to assign roles?**
   Database administrator or system initialization scripts inserting into `user_roles` linking `user_id` to the `COLLECTOR` role ID.
3. **Who is allowed to create collectors?**
   Administrative provisioning routines inserting into `public.collectors` linked to `profiles.id` and `mcd_wards.id`.
4. **How organization/ward is assigned?**
   MCD Ward 42 Green Park RWA organization (`organizations` table) is linked to `mcd_wards`.
5. **Whether a Firebase-authenticated user is expected to automatically create a profile**:
   Firebase Third-Party Auth handles token translation; database profile is synced to `profiles` with `firebase_uid`.
6. **Whether an administrative RPC exists**:
   `user_roles` and `collectors` tables store authoritative mappings.

---
*Generated for NirmalTag Iteration 9.10 Forensic Audit.*
