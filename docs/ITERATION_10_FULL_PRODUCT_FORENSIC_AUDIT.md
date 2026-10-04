# NIRMALTAG — ITERATION 10 FULL PRODUCT FUNCTIONAL & UI/UX FORENSIC AUDIT

**Date**: October 4, 2026  
**Scope**: Full Product Audit — Web Application (Next.js/React/Supabase) + Android Mobile App (`com.nirmaltag.app`) + 7-Role RBAC Model  
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

## 2. WEB APPLICATION AUDIT (NEXT.JS & SUPABASE BACKEND)

### A. Authentication & RBAC Verification
- Web authentication uses Supabase Auth + Firebase ID token verification middleware.
- Security Invariants:
  - Users registered via public registration default to `HOUSEHOLD` or `COLLECTOR` roles.
  - Privileged role endpoints (`/api/admin/*`, `/api/mcd/*`, `/api/tag-officer/*`) validate `user_roles` server-side via Supabase Row Level Security (RLS) policies.
  - Tag state transition `ACTIVE` $\rightarrow$ `CLOSED` is strictly enforced in PostgreSQL functions (`pickup_transaction_rpc`), preventing tag reuse.

### B. UI/UX Verification
- Dashboard components utilize responsive design tokens, high-contrast typography, and accessible color palettes (`#0D5C3A` Primary Green, `#0F172A` Text Dark).
- Action buttons provide immediate visual feedback with micro-animations and loading spinners.

---

## 3. ANDROID APK MOBILE AUDIT (`com.nirmaltag.app`)

### A. Onboarding & Screen Flow Verification
- Initial screen (`AppIntroScreen`) displays brand identity, core value propositions, and a fixed bottom CTA button (`"Get Started / Select User Role"`) that is immediately visible without scrolling.
- Auth screen (`UserTypeAuthScreen`) provides standard Google Sign-In with 4-color Google "G" logo vector asset (`R.drawable.ic_google_logo`).
- Tapping `"Continue with Google"` invokes real Google Play Services Auth picker (`GoogleSignInClient` + `rememberLauncherForActivityResult`).
- Google Sign-In cancellation retains state on Auth screen with `"Google sign-in was cancelled."` message (zero fallback to fake login).

### B. Collector Offline Queue & CameraX AI Verification (Iter 9.17.5 & 10)
- Scanner modal (`LiveCameraScannerModal`) uses CameraX + ML Kit for optical QR decoding.
- Scanned evidence photo is persisted to local storage with SHA-256 hash.
- Room database entity is created with state `WAITING_FOR_NETWORK`.
- UI observes Room database reactively via `getPendingCountFlow().collectAsState(initial = 0)`.
- When pending count = 0, Collector UI displays `"All pickups synced"`. When pending count > 0, displays `"X pickup(s) waiting to sync"`.

---

## 4. SECURITY & DATA PRIVACY COMPLIANCE (DPDP ACT 2023)

1. **Secret Scanning**:
   - Zero production PAT tokens, management keys, or database credentials are committed in repository source files.
   - Credentials are loaded exclusively via environment variables (`.env.local` / system environment).
2. **DPDP Compliance Notice**:
   - Purpose Limitation & Data Fiduciary notice integrated into Android registration dialog and web footer.
   - On-device evidence processing erases transient raw camera bitmaps after feature vector extraction and SHA-256 verification.

---

## 5. CONCLUSION & ITERATION VERDICT

All requirements for Iteration 10 have been fully audited, implemented, verified on physical Android hardware (`PJ7POB99FE89BAWS`), and validated with automated test suites.

**VERDICT**: **PASS**
