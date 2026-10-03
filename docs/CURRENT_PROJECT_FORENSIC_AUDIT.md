# NIRMALTAG — COMPLETE PROJECT FORENSIC AUDIT
**Document Status**: Read-Only Diagnostic Audit Report  
**Audit Executed**: October 3, 2026  
**Auditor**: Antigravity Autonomous Diagnostic Engine  
**Project**: NirmalTag (Civic Tech AI Waste Segregation Platform)

---

## 1. Executive Summary

This document presents a complete, zero-mutation forensic audit of the NirmalTag project codebase, architecture, security posture, authentication pipeline, database schema, and runtime implementations across both the Web (Next.js 14) and Mobile (Android Jetpack Compose) platforms.

### Summary Assessment
- **Web Application Structure**: Fully compiled and navigable Next.js 14 App Router application with 19 static/dynamic routes. User interface and role-based frontend routes are fully built with Tailwind CSS and Shadcn-style components.
- **Mobile Application Structure**: Android Kotlin Jetpack Compose application (`com.nirmaltag.app`) compiled cleanly into `NirmalTag.apk` (~30.3 MB). Features a 3-step Compose navigation flow, CameraX preview integration, Google Auth fallback, and role-specific dashboard views.
- **Core Discrepancies & Blockers**:
  1. **Authentication / Supabase Integration Mismatch**: The application uses Firebase Authentication (Email/Password & Google) on the client side, but Supabase Row Level Security (RLS) policies expect Supabase Auth (`auth.uid()`). No third-party JWT mapping or Supabase Auth custom token exchange is active. Thus, Supabase RLS treats all web/mobile requests as unauthenticated `anon` calls.
  2. **Role Authorization Security Flaw**: User roles are stored in browser `localStorage` (`nirmaltag_user_role`) and client Compose state. Roles are NOT fetched from or verified against the Supabase `user_roles` database table. Any user can manipulate client state to gain access to administrative scopes (`SYSTEM_ADMIN`, `MCD_OFFICER`).
  3. **Simulated vs Actual AI Engine**: `org.tensorflow:tensorflow-lite:2.14.0` is declared in Gradle, but no trained `.tflite` model binary exists in `android/app/src/main/assets/`. Visual evidence verification operates via simulated UI confidence scores.
  4. **Simulated vs Actual Offline Persistence**: Room Database and WorkManager dependencies are present in Gradle, but no Room `@Entity`, `@Dao`, `@Database`, or WorkManager `Worker` Kotlin classes are implemented. Offline queue synchronization relies on transient `@Composable` memory arrays.
  5. **Tag State Invariants**: Supabase SQL migrations define a 14-state tag lifecycle (`CREATED` to `CLOSED`), but web/mobile UI screens perform local string state mutations (`actionMessage`) without persisting updates to the Supabase `tags` table.

---

## 2. Current Architecture

```
[ Android Client (Jetpack Compose) ]        [ Web Client (Next.js 14) ]
             │                                          │
             ├── Firebase Auth SDK ─────────────────────┤
             │   (Email/Password & Google OAuth)        │
             │                                          │
             ├── CameraX Live Preview                   │
             │   (Simulated AI Inference)               │
             │                                          │
             └── Client Memory State                    └── localStorage Role State
                     │                                          │
                     └───────────────────┬──────────────────────┘
                                         ▼
                             [ Firebase Auth Service ]
                                         │ (Firebase UID)
                                         ▼
                        [ Supabase JS Client (Anon Key) ]
                                         │
                                         ▼
                           [ Supabase PostgreSQL DB ]
                          (RLS Policies: auth.uid())
```

### Connection & Protocol Details
- **Mobile ↔ Firebase**: Direct Firebase Android SDK invocation via `com.google.firebase:firebase-auth-ktx`.
- **Web ↔ Firebase**: Direct Firebase JS SDK invocation (`firebase/auth`).
- **Web ↔ Supabase**: Client-side `@supabase/supabase-js` using `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Profile upsert on login syncs `firebase_uid` to `profiles` table.
- **Authorization Breakdown**: Supabase RLS functions (`has_role`) query `profiles.firebase_uid = auth.uid()::text`. Because Firebase JWTs are not signed by Supabase JWT secret, `auth.uid()` evaluates to `NULL` on all Supabase requests.

---

## 3. Actual Technology Stack

| Technology | Version | Where Used | Config File | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Kotlin** | 1.9.20 | Android App | `android/build.gradle.kts` | Active & Configured |
| **Android Gradle Plugin** | 8.2.2 | Android Build | `android/build.gradle.kts` | Active & Configured |
| **Gradle** | 8.14.3 | Build Automation | `gradle-wrapper.properties` | Active & Configured |
| **JDK** | 17 (`17.0.10+7`) | Android Toolchain | `gradle.properties` | Active & Configured |
| **Jetpack Compose** | Material 3 (BOM 2024.02) | Mobile UI | `android/app/build.gradle.kts` | Active & Configured |
| **Android SDK** | Min: 26, Target/Compile: 34 | Android App | `android/app/build.gradle.kts` | Active & Configured |
| **Firebase Auth (Android)** | `33.1.0` (BoM) | Mobile Auth | `android/app/build.gradle.kts` | Partial (SDK included, fallbacks to browser) |
| **Firebase Auth (Web)** | `^10.12.0` | Web Auth | `web/package.json` | Active (`web/lib/firebase.ts`) |
| **Supabase JS Client** | `^2.45.0` | Web Client | `web/package.json` | Active (`web/lib/supabase.ts`) |
| **Next.js** | 14.2.5 (App Router) | Web Frontend & API | `web/package.json` | Active (19 pages compiled) |
| **React** | 18.3.1 | Web Framework | `web/package.json` | Active |
| **TypeScript** | 5.4.5 | Web Codebase | `web/tsconfig.json` | Active (Strict Mode) |
| **Tailwind CSS** | 3.4.4 | Web Styling | `web/tailwind.config.ts` | Active |
| **CameraX** | 1.3.1 | Android Camera | `android/app/build.gradle.kts` | Active ViewFinder (`LiveCameraScannerModal`) |
| **TensorFlow Lite** | 2.14.0 | Mobile AI | `android/app/build.gradle.kts` | **DEMO/SIMULATED** (No `.tflite` asset file present) |
| **Room Database** | 2.6.1 | Mobile Local DB | `android/app/build.gradle.kts` | **MISSING IMPLEMENTATION** (Dependency only) |
| **WorkManager** | 2.9.0 | Mobile Background | `android/app/build.gradle.kts` | **MISSING IMPLEMENTATION** (Dependency only) |

---

## 4. Repository Structure

```
WasteChakra/
├── .gitignore
├── NirmalTag.apk (Untracked compiled debug binary)
├── android/
│   ├── build.gradle.kts
│   ├── gradle.properties
│   ├── settings.gradle.kts
│   ├── app/
│   │   ├── build.gradle.kts
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/nirmaltag/app/
│   │       │   ├── MainActivity.kt
│   │       │   ├── NirmalTagApplication.kt
│   │       │   └── ui/theme/Theme.kt
│   │       └── res/
│   │           ├── drawable/ (logo.jpg, nirmaltag_logo.jpg)
│   │           ├── values/styles.xml
│   │           └── xml/ (backup_rules.xml, data_extraction_rules.xml)
│   └── jdk17/
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.mjs
│   ├── .env.example
│   ├── .env.local
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── login/page.tsx, register/page.tsx
│   │   ├── household/page.tsx, collector/page.tsx, tag-officer/page.tsx
│   │   ├── rwa/page.tsx, bwg/page.tsx, mcd/page.tsx, admin/page.tsx
│   │   ├── privacy/page.tsx, terms/page.tsx, cookies/page.tsx, refund-policy/page.tsx
│   │   └── api/v1/ (pickups/sync/route.ts, tag-batches/route.ts)
│   ├── components/ (Navbar.tsx, Footer.tsx, CookieConsentBanner.tsx)
│   └── lib/ (auth-context.tsx, firebase.ts, supabase.ts)
├── supabase/
│   └── migrations/
│       ├── 20261003000001_initial_nirmaltag_schema.sql
│       └── 20261003000002_rls_policies.sql
├── scripts/
│   └── apply_migrations.mjs
└── docs/
    ├── ARCHITECTURE.md, COST_MODEL.md, DEPLOYMENT.md
    ├── TAG_LIFECYCLE.md, ANTIGRAVITY_REQUIREMENTS.md
    ├── CURRENT_PROJECT_FORENSIC_AUDIT.md
    ├── CURRENT_PROJECT_STATE.json
    └── DIAGNOSTIC_CHECKLIST.md
```

---

## 5. Android Architecture & Navigation Tree

### Component Hierarchy
- `MainActivity.kt`: Contains `NirmalTagAppMasterFlow()` managing state via `MobileAppScreen` enum.

```
App Launch (MainActivity)
 │
 ├── APP_INTRO (AppIntroScreen)
 │    └── Next / Select User Role Button ──► ROLE_AUTH
 │
 ├── ROLE_AUTH (UserTypeAuthScreen)
 │    ├── Step 1: Dropdown User Role Selector (Prioritized: Household & Collector)
 │    ├── Step 2: Sign In / Sign Up Tabs
 │    ├── 1-Click Google Sign-In Button (In-app + Browser Fallback Intent)
 │    ├── Email / Password / Name Form
 │    ├── DPDP Act 2023 Consent Checkbox & Dialog
 │    └── Authenticate Button ──► PORTAL_DASHBOARD
 │
 └── PORTAL_DASHBOARD (RoleDashboardScreen)
      ├── TopAppBar: Logo, Role Label, User Email, Sign Out Button
      ├── Scope Banner: Active Scope Name & MCD Ward 42 Scope
      ├── Action Message Feedback Card
      └── Role Portal Modules:
           ├── HOUSEHOLD: Wallet (₹140), Camera Scanner Modal, Request 10-Pouch Batch, Book Pickup, Redeem Vouchers
           ├── COLLECTOR: Wallet (₹48), Camera Scanner Modal, Sync Offline Queue, Request UPI Payout
           ├── TAG_OFFICER: Generate Batch (1,000 Serials), Assign Batch, Invariant Lookup
           ├── RWA_ADMIN: Resident Roster, Add Resident, Flag Household, Submit Incident Report
           ├── BWG_ADMIN: Log Volume (120kg), Generate & View MCD Compliance Cert (HTML Modal), Export Audit Log
           ├── MCD_OFFICER: Resolve AI Dispute (DSP-101), Issue Violation Notice, Broadcast Ward Advisory
           └── SYSTEM_ADMIN: Provision Role Assignment, Export Security Audit Trail CSV, Run Security Audit
```

---

## 6. Web Architecture & Navigation Tree

```
Root Layout (app/layout.tsx)
 ├── Navbar (components/Navbar.tsx): Logo, Auth Badge, Admin Scope Switcher, Sign Out
 └── Footer (components/Footer.tsx): Brand info, Legal links

Routes:
 ├── / (app/page.tsx): Hero, Primary CTAs ("Household Resident", "Field Waste Collector"), Role Grid
 ├── /login (app/login/page.tsx): Categorized Role Select (<optgroup>), Firebase Auth (Google + Email)
 ├── /register (app/register/page.tsx): Account creation with DPDP consent
 ├── /household (app/household/page.tsx): Citizen portal, credit balance, pickup booking, pouch history
 ├── /collector (app/collector/page.tsx): Scanner UI, offline queue, wallet balance, UPI payout modal
 ├── /tag-officer (app/tag-officer/page.tsx): Batch generator, QR serialization, tag lookup
 ├── /rwa (app/rwa/page.tsx): Colony compliance index, resident roster, incident reporting
 ├── /bwg (app/bwg/page.tsx): Commercial bulk waste logging, MCD Compliance Certificate generator (HTML export)
 ├── /mcd (app/mcd/page.tsx): Ward 42 Executive Command, AI dispute resolver, violation notices
 ├── /admin (app/admin/page.tsx): System RBAC control, role provisioning, security audit CSV export
 ├── /privacy, /terms, /cookies, /refund-policy: Legal documents
 └── /api/v1/pickups/sync, /api/v1/tag-batches: REST endpoints
```

---

## 7. Authentication Forensic Audit

### Authentication Architecture Detail
1. **Identity Provider**: Firebase Auth (Project ID: `nirmaltag`).
2. **Client Authentication**:
   - Web: `signInWithEmailAndPassword` and `signInWithPopup(googleProvider)` in `web/app/login/page.tsx`.
   - Android: `UserTypeAuthScreen` handles form submission and triggers `onAuthSuccess()`, launching deep-link browser fallback (`nirmaltag://auth-callback`) if native Google Play Services credential manager is unavailable.
3. **Supabase Profile Sync**:
   - On `onAuthStateChanged`, `AuthProvider` (`web/lib/auth-context.tsx`) executes:
     `supabase.from("profiles").upsert({ id: currentUser.uid, firebase_uid: currentUser.uid, ... })`
4. **Critical Failure Point**:
   - Supabase RLS functions (`has_role`) check `p.firebase_uid = auth.uid()::text`.
   - In Supabase, `auth.uid()` reads the `sub` claim of the Supabase JWT.
   - Because client calls use the Supabase `anon` key without exchanging Firebase ID tokens for Supabase JWTs, `auth.uid()` evaluates to `NULL` for all Supabase PostgREST queries.
   - **Impact**: All database queries guarded by RLS fail unless RLS is bypassed or policies are modified.

---

## 8. User Role Forensic Audit

| Role Name | Source of Truth | Frontend Check | Backend Check | RLS Policy | Security Vulnerability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HOUSEHOLD** | Client `localStorage` / Compose State | `role === "HOUSEHOLD"` | None | `auth.uid()` check | High: Client state can be mutated to any role |
| **COLLECTOR** | Client `localStorage` / Compose State | `role === "COLLECTOR"` | None | `has_role('COLLECTOR')` | High: Client state can be mutated to any role |
| **TAG_OFFICER** | Client `localStorage` / Compose State | `role === "TAG_OFFICER"` | None | `has_role('TAG_OFFICER')` | High: Privilege escalation via localStorage |
| **RWA_ADMIN** | Client `localStorage` / Compose State | `role === "RWA_ADMIN"` | None | `has_role('RWA_ADMIN')` | High: Privilege escalation via localStorage |
| **BWG_ADMIN** | Client `localStorage` / Compose State | `role === "BWG_ADMIN"` | None | `has_role('BWG_ADMIN')` | High: Privilege escalation via localStorage |
| **MCD_OFFICER** | Client `localStorage` / Compose State | `role === "MCD_OFFICER"` | None | `has_role('MCD_OFFICER')` | High: Privilege escalation via localStorage |
| **SYSTEM_ADMIN** | Client `localStorage` / Compose State | `role === "SYSTEM_ADMIN"` | None | `has_role('SYSTEM_ADMIN')` | High: Unrestricted admin access via client edit |

---

## 9. Tag System & Lifecycle Audit

### Intended Lifecycle vs Actual Implementation

```
[ Intended Invariant Pipeline ]
CREATED ──► REGISTERED ──► ASSIGNED ──► ACTIVE ──► SCANNED ──► VERIFIED ──► CLOSED

[ Actual Implementation ]
UI Button Click ──► Generate Random String ("NT-SAN-2026-8001") ──► Set Local State Message
(No persistent database write to Supabase `tags` table; invariant enforcement is simulated in UI string)
```

- **Duplicate Tags**: Possible (generated randomly in component memory without unique constraint checks against DB).
- **Tag Re-use**: Simulated server lock text string displayed in UI; no SQL trigger or database check prevents re-scanning.

---

## 10. Database Schema & RLS Audit

### Database Table Inventory (`supabase/migrations/20261003000001_initial_nirmaltag_schema.sql`)

| Table Name | Primary Key | Key Foreign Keys | RLS Enabled? | Intended Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `roles` | `id` (UUID) | None | Yes | Enums for 7 system roles |
| `permissions` | `id` (UUID) | None | Yes | Permission definitions |
| `role_permissions` | `(role_id, permission_id)` | `roles`, `permissions` | Yes | RBAC junction table |
| `profiles` | `id` (UUID) | `auth.users.id` | Yes | User account profiles (Firebase UID mapping) |
| `user_roles` | `(user_id, role_id)` | `profiles`, `roles` | Yes | User role assignments |
| `households` | `id` (UUID) | `profiles.id`, `wards.id` | Yes | Household resident records & Ward linking |
| `collectors` | `id` (UUID) | `profiles.id`, `wards.id` | Yes | Field waste collector profiles & vehicle IDs |
| `officer_profiles` | `id` (UUID) | `profiles.id`, `organizations.id` | Yes | Tag officer, MCD officer profiles |
| `organizations` | `id` (UUID) | None | Yes | RWA colonies, BWG commercial entities |
| `wards` | `id` (UUID) | None | Yes | Municipal wards (Ward 42) |
| `tag_batches` | `id` (UUID) | `profiles.id`, `organizations.id` | Yes | QR tag serial batches |
| `tags` | `id` (UUID) | `tag_batches.id`, `households.id` | Yes | Single-use tamper-evident QR pouch tags |
| `tag_assignments` | `id` (UUID) | `tags.id`, `households.id` | Yes | Tag distribution history |
| `pickups` | `id` (UUID) | `tags.id`, `collectors.id`, `households.id` | Yes | Doorstep waste pickup records |
| `pickup_evidence` | `id` (UUID) | `pickups.id` | Yes | Camera evidence photo hash & storage paths |
| `ai_verifications` | `id` (UUID) | `pickups.id` | Yes | TFLite MobileNetV3 visual classification logs |
| `credit_accounts` | `id` (UUID) | `households.id` | Yes | Eco-point credit balances |
| `credit_transactions` | `id` (UUID) | `credit_accounts.id`, `pickups.id` | Yes | Double-entry point ledger |
| `collector_incentive_accounts` | `id` (UUID) | `collectors.id` | Yes | Collector cash incentive wallet (₹2.00/pickup) |
| `collector_incentive_transactions` | `id` (UUID) | `collector_incentive_accounts.id` | Yes | Cash incentive ledger |
| `audit_logs` | `id` (UUID) | `profiles.id` | Yes | System security event audit trail |

### RLS Policy Audit Highlights (`20261003000002_rls_policies.sql`)
- `has_role(p_role)` function uses `p.firebase_uid = auth.uid()::text`.
- **Finding**: Because Firebase ID tokens are not converted to Supabase JWTs, `auth.uid()` is `NULL`. `has_role()` returns `FALSE` for all non-service requests.

---

## 11. AI & On-Device Vision Audit

- **Claimed Functionality**: On-device MobileNetV3 TensorFlow Lite model classifying sanitary vs dry/wet waste offline.
- **Gradle Configuration**: `implementation("org.tensorflow:tensorflow-lite:2.14.0")` and `implementation("org.tensorflow:tensorflow-lite-support:0.4.4")` present in `android/app/build.gradle.kts`.
- **Actual Asset Files**: Directory `android/app/src/main/assets/` is **MISSING** (no `.tflite` model binary or labels text file).
- **Inference Execution**: `LiveCameraScannerModal` executes a `simulatedFrame` routine returning hardcoded confidence `0.984` and label `"MobileNetV3 AI: SANITARY POUCH VERIFIED"`.

---

## 12. Offline Architecture & Storage Audit

- **Claimed Functionality**: Offline field collector operation with Room local database persistence and WorkManager synchronization.
- **Gradle Dependencies**: `room-runtime:2.6.1`, `room-ktx:2.6.1`, `work-runtime-ktx:2.9.0` included in `android/app/build.gradle.kts`.
- **Actual Code**:
  - Room `@Entity`, `@Dao`, `@Database` classes: **MISSING**.
  - WorkManager `Worker` or `CoroutineWorker` classes: **MISSING**.
  - Offline sync relies on `@Composable` in-memory state string list.

---

## 13. Environment Variables (Redacted)

| Variable | Used By | Purpose | Public / Secret | Present? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web Client | Firebase Web Auth | Public | Yes | `[PRESENT — REDACTED]` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Web Client | Firebase Auth Domain | Public | Yes | `[PRESENT — REDACTED]` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Web Client | Firebase Project ID | Public | Yes | `[PRESENT — REDACTED]` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Web Client | Firebase Storage | Public | Yes | `[PRESENT — REDACTED]` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Web Client | FCM Messaging | Public | Yes | `[PRESENT — REDACTED]` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web Client | Firebase Web App ID | Public | Yes | `[PRESENT — REDACTED]` |
| `NEXT_PUBLIC_SUPABASE_URL` | Web / Mobile | Supabase Endpoint | Public | Yes | `[PRESENT — REDACTED]` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web / Mobile | Supabase Anon Key | Public | Yes | `[PRESENT — REDACTED]` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server API | Supabase Admin API | Secret | No | `[MISSING in .env.local]` |

---

## 14. Current vs Expected Implementation Matrix

| Feature Module | Expected Behavior | Actual Implementation Status | Detailed Finding |
| :--- | :--- | :--- | :--- |
| **Email Authentication** | Firebase Auth login & user record creation | **WORKING** | Firebase Auth handles login; profile upserts to Supabase `profiles`. |
| **Google Authentication** | 1-Click OAuth on Web & Android | **WORKING (Web) / PARTIAL (Mobile)** | Web uses Firebase popup; Mobile uses in-app trigger with browser deep-link fallback. |
| **Role Authorization** | DB-backed RBAC enforced via RLS | **BROKEN** | Frontend reads role from `localStorage`/state; Supabase RLS fails due to null `auth.uid()`. |
| **Camera QR Scanner** | CameraX preview & QR payload decode | **WORKING** | CameraX `PreviewView` renders live camera feed inside Compose modal. |
| **AI Visual Evidence** | On-device MobileNetV3 TFLite classification | **DEMO/SIMULATED** | TFLite dependency present, but no `.tflite` model binary exists in assets. |
| **Tag Invariant State** | Closed-loop server state (`CREATED` -> `CLOSED`) | **DEMO/SIMULATED** | State defined in SQL schema, but client updates UI strings without writing to Supabase `tags`. |
| **MCD Certificate** | Dynamic HTML certificate generation & export | **WORKING** | Interactive modal renders formatted MCD Compliance Certificate with download trigger. |
| **Offline Sync Queue** | Room DB storage + WorkManager background sync | **MISSING** | Room & WorkManager libraries in Gradle; no Kotlin DAO/Worker classes implemented. |
| **Credit Ledger** | Double-entry point ledger in Supabase | **PARTIAL** | UI calculates points/incentives locally; DB table exists in migration. |

---

## 15. Root Cause Analysis

1. **Authentication Token Mismatch (Firebase ↔ Supabase)**
   - *Symptom*: Database queries guarded by RLS do not return user-specific rows or fail with permission errors.
   - *Root Cause*: Firebase Auth generates Firebase ID tokens. Supabase PostgREST expects a Supabase JWT signed with the Supabase JWT Secret. Passing the Supabase `anon` key without a Supabase session leaves `auth.uid()` as `NULL`.
   - *Correct Fix Direction*: Implement a Supabase Custom JWT function / Auth Webhook or custom token exchange endpoint that issues a valid Supabase JWT containing the user's `firebase_uid` and verified `role`.

2. **Client-Side Role Authorization**
   - *Symptom*: Roles can be switched arbitrarily by editing `localStorage` key `nirmaltag_user_role`.
   - *Root Cause*: Frontend pages (`/admin`, `/mcd`, `/bwg`) check `role` from `useAuth()` context, which reads directly from `localStorage.getItem("nirmaltag_user_role")`.
   - *Correct Fix Direction*: Fetch user role directly from Supabase `user_roles` table during authentication session bootstrap.

3. **Missing Model Binary & Database Sync Classes**
   - *Symptom*: AI vision and offline Room DB sync do not execute actual native operations.
   - *Root Cause*: Build scripts include dependencies, but assets (`mobilenet_v3.tflite`) and Kotlin data persistence code (`AppDatabase.kt`, `SyncWorker.kt`) were not generated.
   - *Correct Fix Direction*: Add TFLite model binary to `android/app/src/main/assets/` and implement Room DAO & WorkManager sync pipeline.

---

## 16. Recommended Repair Sequence (For Future Execution)

1. **Phase 1: Auth & Token Integration** (Configure Firebase ID Token ↔ Supabase JWT exchange so `auth.uid()` and `has_role()` resolve accurately in Supabase RLS).
2. **Phase 2: Database Role Resolution** (Update `AuthContext` to fetch role from Supabase `user_roles` table instead of relying on `localStorage`).
3. **Phase 3: Database Tag Persistence** (Connect Web & Mobile QR scanning and tag registration screens to execute direct PostgREST operations on Supabase `tags` and `pickups` tables).
4. **Phase 4: Mobile AI Model & Offline Engine** (Place `mobilenet_v3.tflite` model in Android assets, implement TFLite interpreter, and build Room DB / WorkManager sync classes).
