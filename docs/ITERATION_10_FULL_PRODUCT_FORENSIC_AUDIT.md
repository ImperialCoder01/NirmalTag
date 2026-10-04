# NIRMALTAG — ITERATION 10 & 10.1 FULL PRODUCT FUNCTIONAL & UI/UX FORENSIC AUDIT

**Date**: October 4, 2026  
**Scope**: Full Product Audit — Web Application (Next.js/React/Supabase) + Android Mobile App (`com.nirmaltag.app`) + 7-Role RBAC Model  
**Target Device**: Physical Android Phone `PJ7POB99FE89BAWS` (OPPO A15s, Android 10, API 29)  
**Status**: COMPLETE  

---

## 1. PRODUCT ARCHITECTURE & ROLE MATRIX AUDIT

NirmalTag implements an integrated 7-role civic waste management platform with strict Role-Based Access Control (RBAC), on-device MobileNetV3 TFLite AI verification, tamper-evident single-use QR tag serialization, and DPDP Act 2023 privacy compliance.

| Role ID | Role Title | Portal / Interface | Target User Group | Permitted Operations | Self-Registration Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`HOUSEHOLD`** | Household Resident | Household Portal (`/household`) | End-user residents | Request pouch batches, scan QR tags, view circular credit balance, redeem eco-vouchers, book doorstep special-care pickups. | **YES** |
| **`COLLECTOR`** | Field Waste Collector | Collector App (`/collector`) | Doorstep waste collection workers | Scan pouch QR via CameraX/ML Kit, capture AI evidence photo, store local Room queue (`WAITING_FOR_NETWORK`), sync via WorkManager, track handling wallet (+₹2/pickup). | **YES** |
| **`TAG_OFFICER`** | Tag Officer | Tag Serialization Hub (`/tag-officer`) | Municipal Tag Provisioning Officers | Generate serial pouch batches, assign batches to RWAs/BWGs, enforce single-use server state invariants (`ACTIVE` $\rightarrow$ `CLOSED`). | No (Admin Provisioned) |
| **`RWA_ADMIN`** | RWA Administrator | RWA Colony Dashboard (`/rwa`) | Resident Welfare Associations | Manage colony household list, track colony segregation compliance index (%), flag non-compliant households, submit ward incidents. | No (Admin Provisioned) |
| **`BWG_ADMIN`** | BWG Administrator | Commercial BWG Hub (`/bwg`) | Commercial Bulk Waste Generators | Log daily bulk waste volumes (kg), container seals, export monthly audit CSV, generate official MCD compliance certificates. | No (Admin Provisioned) |
| **`MCD_OFFICER`** | MCD Municipal Officer | Executive Command (`/mcd`) | Municipal Corporation Officers | Ward-wide telemetry analytics, resolve AI verification disputes, issue municipal violation notices, broadcast ward advisories. | No (Admin Provisioned) |
| **`SYSTEM_ADMIN`** | System Administrator | RBAC Control Panel (`/admin`) | Platform Operations Team | Manage user role assignments, audit database security policies (RLS), inspect system telemetry, export security audit logs. | No (Admin Provisioned) |

---

## 2. 7-ROLE BUTTON & ACTION INVENTORY AUDIT

| Role | Platform | Screen | Action / Feature | Backend Implementation | Authorization Control | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `HOUSEHOLD` | Web & Android | Household Portal | Request Pouch Batch | Supabase `pouch_requests` table insert | RLS: `auth.uid() = user_id` | **VERIFIED** |
| `HOUSEHOLD` | Web & Android | Household Portal | Redeem Circular Credits | Supabase `credit_redemptions` RPC | RLS: `balance >= points_requested` | **VERIFIED** |
| `HOUSEHOLD` | Web & Android | Household Portal | Book Doorstep Pickup | Supabase `pickup_bookings` insert | RLS: `auth.uid() = user_id` | **VERIFIED** |
| `COLLECTOR` | Android | Collector Dashboard | Live Camera QR Scan | CameraX + ML Kit Optical Decoder | On-Device Local Hardware | **VERIFIED** |
| `COLLECTOR` | Android | Collector Dashboard | Offline Queue Save | Android Room Database Entity | `WAITING_FOR_NETWORK` state | **VERIFIED** |
| `COLLECTOR` | Android | Collector Dashboard | WorkManager Queue Sync | `PickupSyncWorker` + `pickup_transaction_rpc` | Firebase ID Token + RLS | **VERIFIED** |
| `TAG_OFFICER` | Web & Android | Serialization Hub | Generate Serial Batch | Postgres RPC `generate_tag_batch` | Server RLS: `role = 'TAG_OFFICER'` | **VERIFIED** |
| `TAG_OFFICER` | Web & Android | Serialization Hub | Lookup Tag Invariant State | Postgres table `tag_inventory` query | Server RLS: Tag Officer scope | **VERIFIED** |
| `RWA_ADMIN` | Web & Android | RWA Dashboard | Register Colony Resident | Postgres table `rwa_households` insert | Server RLS: `rwa_id` match | **VERIFIED** |
| `RWA_ADMIN` | Web & Android | RWA Dashboard | Flag Non-Compliant Household | Postgres RPC `flag_household_violation` | Server RLS: RWA scope | **VERIFIED** |
| `BWG_ADMIN` | Web & Android | Commercial BWG Hub | Log Bulk Waste Volume | Postgres table `bwg_daily_logs` insert | Server RLS: BWG establishment scope | **VERIFIED** |
| `BWG_ADMIN` | Web & Android | Commercial BWG Hub | Generate MCD Compliance Cert | Server-side PDF/HTML Generator | Verified volume threshold check | **VERIFIED** |
| `MCD_OFFICER` | Web & Android | Executive Command | Resolve AI Dispute | Postgres RPC `resolve_ai_dispute` | Server RLS: MCD Officer scope | **VERIFIED** |
| `MCD_OFFICER` | Web & Android | Executive Command | Issue Municipal Notice | Postgres table `mcd_notices` insert | Server RLS: Ward Officer scope | **VERIFIED** |
| `SYSTEM_ADMIN` | Web & Android | Security Control | Provision User Role | Postgres function `assign_user_role` | Server RLS: `SYSTEM_ADMIN` only | **VERIFIED** |

---

## 3. SECURITY, RLS & MOCK AUTH AUDIT FINDINGS

1. **Third-Party Auth Bridge Invariant**:
   - Authentication flow enforces `Google` $\rightarrow$ `Firebase Auth` $\rightarrow$ `Firebase ID Token` $\rightarrow$ `Supabase Third-Party Auth` $\rightarrow$ `Firebase UID Bridge` $\rightarrow$ `profile` $\rightarrow$ `user_roles`.
2. **Database Row Level Security (RLS)**:
   - Evaluated PostgreSQL RLS policies across `tag_inventory`, `pickups`, `profiles`, `user_roles`, `rwa_households`, `bwg_daily_logs`.
   - Direct attempts by unauthenticated or unauthorized users to read/write tags outside assigned ward/household return database permission denials.
3. **Secret Scan**:
   - Zero hardcoded Firebase ID tokens, OAuth tokens, passwords, Supabase management PAT keys, or service role keys committed in source files.
4. **Mock / Fake Auth Scan**:
   - Zero auto-login shortcuts or simulated fallback authentications remain in production code paths.

---

## 4. FINAL VERDICT & ACCEPTANCE CRITERIA MATRIX

```text
ANDROID ONBOARDING                — PASS
GOOGLE ACCOUNT A LOGIN            — VERIFIED
GOOGLE SIGN OUT                   — VERIFIED
GOOGLE ACCOUNT SWITCHING A -> B   — VERIFIED
GOOGLE ACCOUNT SWITCHING B -> A   — VERIFIED
GOOGLE CANCELLATION               — PASS
GOOGLE AUTHENTICATION END-TO-END  — VERIFIED
EMAIL SIGN-IN                     — VERIFIED
EMAIL SIGN-UP                     — VERIFIED
PRIVILEGED ROLE PROTECTION        — VERIFIED
AUTH UI/UX                        — PASS
COLLECTOR REGRESSION              — PASS
WEB AUTH                          — VERIFIED
FULL WEB AUDIT                    — VERIFIED
FULL ANDROID AUDIT                — VERIFIED
RLS AUDIT                         — VERIFIED
MOCK/FAKE AUTH AUDIT              — VERIFIED
SECURITY AUDIT                    — PASS

OVERALL: NO CRITICAL BLOCKERS
```
