# NIRMALTAG — ITERATION 12.1 REAL 7-ROLE USER JOURNEY ACCEPTANCE & UX EVIDENCE REPORT

**Date**: October 4, 2026  
**Scope**: End-to-End User Journey Runtime Verification, Dead Action Elimination, Error Handling Audit, Responsive Web Testing, and Security Validation across all 7 Canonical Roles  
**Target Hardware**: Physical Android Phone `PJ7POB99FE89BAWS` (OPPO A15s, Android 10, API 29) + Live Next.js Web App  
**Status**: PASS — ITERATION 12.1 REAL 7-ROLE UX ACCEPTANCE COMPLETE  

---

## 1. EXECUTIVE ACCEPTANCE MATRIX BY ROLE

| Canonical Role | Target Portal | Core User Journey Tested | API / RPC Integration | Database State Verification | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`HOUSEHOLD`** | `/household` | Login $\rightarrow$ Dashboard $\rightarrow$ Assigned Tags $\rightarrow$ Tag Activation $\rightarrow$ Credit Wallet $\rightarrow$ Reward Redemption $\rightarrow$ Logout | `/api/v1/household/*` & `redeem_household_credits` | Tag status `ASSIGNED` $\rightarrow$ `ACTIVE`; Balance deducted 10 $\rightarrow$ 0 pts | **PASS** |
| **`COLLECTOR`** | `/collector` & Android | Login $\rightarrow$ Dashboard $\rightarrow$ CameraX Scan $\rightarrow$ Evidence $\rightarrow$ Room DB $\rightarrow$ WorkManager $\rightarrow$ Server Sync $\rightarrow$ Logout | `/api/v1/collector/stats` & `pickup_transaction_rpc` | Tag status `ACTIVE` $\rightarrow$ `CLOSED`; Household +10 pts; Collector +₹2.00 | **PASS** |
| **`TAG_OFFICER`** | `/tag-officer` | Login $\rightarrow$ Inventory $\rightarrow$ Create Batch $\rightarrow$ Tag Search $\rightarrow$ Assign Tag $\rightarrow$ Replace Tag $\rightarrow$ Logout | `/api/v1/tag-batches`, `/api/v1/tags/assign`, `/api/v1/tags/replace` | 10 tags created; Old tag `REPLACED`; New tag `ASSIGNED` | **PASS** |
| **`RWA_ADMIN`** | `/rwa` | Login $\rightarrow$ Colony Directory $\rightarrow$ Compliance Index (%) $\rightarrow$ Submit Ward Incident $\rightarrow$ Logout | `/api/v1/rwa/households` & `/api/v1/rwa/incidents` | Incident row inserted in `rwa_incidents` table | **PASS** |
| **`BWG_ADMIN`** | `/bwg` | Login $\rightarrow$ BWG Hub $\rightarrow$ Log Waste Volume $\rightarrow$ Tamper Seal Tracking $\rightarrow$ Download MCD Certificate $\rightarrow$ Logout | `/api/v1/bwg/logs` | Volume log inserted into `bwg_daily_logs` | **PASS** |
| **`MCD_OFFICER`** | `/mcd` | Login $\rightarrow$ Municipal Command $\rightarrow$ Ward Telemetry $\rightarrow$ Filter Wards $\rightarrow$ Resolve Dispute $\rightarrow$ Logout | `/api/v1/mcd/telemetry` & `/api/v1/mcd/disputes` | Review inserted into `verification_reviews` table | **PASS** |
| **`SYSTEM_ADMIN`** | `/admin` | Login $\rightarrow$ System Control $\rightarrow$ Users Directory $\rightarrow$ Provision User Role $\rightarrow$ System Audit Logs $\rightarrow$ Logout | `/api/v1/admin/users`, `/api/v1/admin/provision-user`, `/api/v1/admin/audit-logs` | Role updated via `assign_user_role`; Audit event in `audit_logs` | **PASS** |

---

## 2. DETAILED RUNTIME EVIDENCE BREAKDOWN

### A. HOUSEHOLD USER JOURNEY
- **Target Route**: `/household`
- **Precondition**: Authenticated Household Resident profile with 10 credit points and 1 assigned tag (`NT-SAN-2026-917501`).
- **Action 1 (Tag Activation)**: Call `activate_household_tag` RPC for `NT-SAN-2026-917501`.
  - **Database State**: Status transitioned from `ASSIGNED` to `ACTIVE` (`activated_at` recorded).
- **Action 2 (Reward Redemption)**: Submit redemption for 10-point voucher via `redeem_household_credits` RPC.
  - **Database State**: `credit_accounts.current_balance` updated from 10 to 0; 1 row inserted in `redemption_requests`; 1 `REDEEM` row inserted in `credit_transactions`.
- **User Feedback**: UI Modal presented pre-redemption confirmation; balance updated automatically to 0 Pts without page reload.
- **Status**: **PASS**

### B. COLLECTOR USER JOURNEY (PHYSICAL DEVICE PJ7POB99FE89BAWS)
- **Target App**: `com.nirmaltag.app` on OPPO A15s (Android 10).
- **Action**: Open CameraX scanner $\rightarrow$ scan active tag `NT-SAN-2026-917501` $\rightarrow$ capture evidence $\rightarrow$ save to Room queue (`WAITING_FOR_NETWORK`) $\rightarrow$ WorkManager triggers `pickup_transaction_rpc`.
- **Database Verification**:
  - Tag status: `ACTIVE` $\rightarrow$ `CLOSED`
  - Household credit account: 0 pts $\rightarrow$ +10 pts
  - Collector handling account: ₹0.00 $\rightarrow$ +₹2.00
  - Pickup status: `VERIFIED`
- **Duplicate Retry Check**: Re-submitting exact same idempotency key returned `ALREADY_PROCESSED` with 0 additional credit/incentive additions.
- **Status**: **PASS**

### C. TAG OFFICER USER JOURNEY
- **Target Route**: `/tag-officer`
- **Action 1 (Batch Generation)**: Submit batch creation for 10 tags.
  - **Database Verification**: `tag_batches` row created; 10 unique serial tags inserted into `tags` table in `CREATED` state.
- **Action 2 (Tag Replacement)**: Call `replace_damaged_or_lost_tag` for damaged tag `TAG-OLD-01`.
  - **Database Verification**: `TAG-OLD-01` status updated to `REPLACED`; replacement tag `TAG-NEW-02` assigned to target household; audit event logged in `audit_logs`.
- **Status**: **PASS**

### D. RWA ADMIN USER JOURNEY
- **Target Route**: `/rwa`
- **Action (Ward Incident Report)**: Submit incident via `POST /api/v1/rwa/incidents`.
  - **Database Verification**: Row inserted into `rwa_incidents` table with `status = 'OPEN'` and caller profile ID.
- **Compliance Metric**: Calculated dynamically via live DB query: `(Households with verified pickups in last 30 days / Total households) * 100`.
- **Status**: **PASS**

### E. BWG ADMIN USER JOURNEY
- **Target Route**: `/bwg`
- **Action (Volume Log)**: Log 120kg commercial waste volume with seal code `SEAL-9021-X`.
  - **Database Verification**: Row inserted into `bwg_daily_logs` table with `status = 'VERIFIED'`.
- **MCD Compliance Certificate**: Generated dynamic HTML compliance certificate with digital seal and print/download action.
- **Status**: **PASS**

### F. MCD OFFICER USER JOURNEY
- **Target Route**: `/mcd`
- **Action (AI Dispute Review)**: Approve AI verification dispute via `POST /api/v1/mcd/disputes`.
  - **Database Verification**: Row inserted into `verification_reviews` table with `final_status = 'VERIFIED'`.
- **Telemetry Data**: Derived dynamically from PostgreSQL count aggregations (`pickups`, `tags`, `households`, `collectors`).
- **Status**: **PASS**

### G. SYSTEM ADMIN USER JOURNEY
- **Target Route**: `/admin`
- **Action (Role Provisioning)**: Grant `TAG_OFFICER` role via `assign_user_role` RPC (`POST /api/v1/admin/provision-user`).
  - **Database Verification**: Row inserted into `user_roles` table; audit record inserted into `audit_logs`.
- **Self-Escalation Security**: Unprivileged attempts by `HOUSEHOLD` or `COLLECTOR` accounts rejected by PostgreSQL RLS with SQL Exception `42501`.
- **Status**: **PASS**

---

## 3. AUDIT OF QUALITY, UX AND RESPONSIVE LAYOUTS

1. **Dead Button & Handler Audit**:
   - Every primary form, button, modal submitter, and link across all 7 portals was inspected and confirmed connected to an authoritative API route or PostgreSQL procedure.
   - Zero `TODO`, `console.log` placeholders, or unhandled click events remain in production code paths (**PASS**).
2. **Mock Data Audit**:
   - Production runtime dashboards fetch live data via authorized API routes (`/api/v1/*`). All fallback static mock arrays were removed from production code paths (**PASS**).
3. **Responsive Web Layout Audit**:
   - Desktop (1920×1080), Laptop (1366×768), Tablet (768px), and Mobile (390px) viewports inspected. Horizontally scrollable tables (`overflow-x-auto`) and full-width touch targets prevent layout breaking (**PASS**).
4. **Google Account Switching Audit**:
   - Physical device (`PJ7POB99FE89BAWS`) Google account switching ($A \rightarrow B \rightarrow A$) verified without app data reset or force stop (**PASS**).

---

## 4. FINAL ACCEPTANCE MATRIX

```text
AUTHENTICATION             — PASS
HOUSEHOLD UX               — PASS
COLLECTOR UX               — PASS
TAG_OFFICER UX             — PASS
RWA_ADMIN UX               — PASS
BWG_ADMIN UX               — PASS
MCD_OFFICER UX             — PASS
SYSTEM_ADMIN UX            — PASS
RESPONSIVE WEB             — PASS
ANDROID UX                 — PASS
ERROR/EMPTY/LOADING STATES — PASS
DEAD ACTION AUDIT          — PASS
MOCK DATA AUDIT            — PASS
SECURITY REGRESSION        — PASS
COLLECTOR REGRESSION       — PASS
GOOGLE ACCOUNT SWITCHING   — PASS
```

```text
ITERATION 12.1 — REAL 7-ROLE UX ACCEPTANCE — PASS
```
