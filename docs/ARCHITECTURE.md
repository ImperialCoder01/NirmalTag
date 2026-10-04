# NIRMALTAG — TECHNICAL ARCHITECTURE SPECIFICATION

**Platform**: NirmalTag Civic Tech Monorepo  
**Version**: `1.0.0`  
**License**: Municipal Civic-Tech Open Specification  

---

## 1. SYSTEM OVERVIEW & MONOREPO STRUCTURE

NirmalTag is structured as a clean, decoupled monorepo:

```text
NirmalTag/
├── android/            # Android Kotlin Application (CameraX, ML Kit, Room, WorkManager)
├── web/                # Next.js 14 App Router Web Application (39 Prerendered Routes)
├── supabase/           # PostgreSQL Migrations, RLS Policies, Database Functions
├── docs/               # Architecture, Security, AI, User Guides & System Documentation
├── scripts/            # Database, CI/CD, and Batch Helper Utilities
└── assets/             # Brand identity, logos, and visual assets
```

---

## 2. WEB ARCHITECTURE (Next.js 14 App Router)

- **Framework**: Next.js 14.2 App Router (React 18, Server Components & Client Components).
- **TypeScript**: Strict type checking across API routes and client contexts.
- **Styling**: Tailwind CSS utility-first layout design + Lucide React icons.
- **Authentication Context**: `AuthProvider` (`web/lib/auth-context.tsx`) wrapping Firebase Web SDK.
- **API Routes**: 20 RESTful API endpoints (`web/app/api/v1/*`) enforcing Firebase Bearer Token authorization (`web/lib/supabase-auth.ts`).

---

## 3. ANDROID ARCHITECTURE (Native Kotlin)

- **Language & SDK**: Kotlin 1.9, Android SDK 34 (minSdk 26).
- **UI Framework**: Jetpack Compose + Material3.
- **Camera & Barcode**: CameraX 1.3 frame analyzer + Google ML Kit Barcode Scanning 17.2 for QR decoding.
- **Offline Persistence**: Room DB 2.6 (`nirmaltag_offline.db`) storing `PickupEntity` records with offline states (`WAITING_FOR_NETWORK`, `SERVER_VERIFIED`, `SERVER_REJECTED`).
- **Background Synchronization**: WorkManager 2.9 (`PickupSyncWorker`) executing HTTP POST requests with Firebase ID tokens.
- **Visual Engine**: `VisualVerificationEngine.kt` evaluating photo assets (returns `MODEL_UNAVAILABLE` when `.tflite` model file is unbundled).

---

## 4. BACKEND & DATABASE ARCHITECTURE (Supabase PostgreSQL + Firebase Auth)

- **Database Engine**: Hosted PostgreSQL on Supabase.
- **Identity Bridge**: Firebase Authentication ID tokens verified in PostgreSQL via `auth.jwt() -> 'sub'`.
- **Functions & RPCs**:
  - `get_authenticated_firebase_uid()`: Resolves Firebase UID string.
  - `get_authenticated_profile_id()`: Maps Firebase UID to `user_profiles` UUID.
  - `has_role(target_role)`: Evaluates user role membership from `user_roles`.
  - `pickup_transaction_rpc`: Executes atomic pickup validation, reward allocation (+10 pts household, +₹2.00 collector), and tag state transition (`ACTIVE` $\rightarrow$ `CLOSED`).
  - `activate_household_tag`: Activates assigned household tag.
  - `redeem_household_credits`: Deducts credit points atomically and writes redemption log.
  - `create_tag_batch_and_records`: Creates batch of QR tags (1 to 5,000).
  - `assign_tag_to_household`: Links tag serial to household user profile.
  - `replace_damaged_or_lost_tag`: Replaces tag serial in inventory.
  - `assign_user_role`: System Admin role assignment.

---

## 5. DEPLOYMENT PIPELINE

- **Web**: Hosted on Vercel (`https://nirmaltag.vercel.app`).
- **Database**: Hosted Supabase PostgreSQL instance with automated daily backups.
- **Mobile**: Direct Sideload Release APK (`NirmalTag.apk`) + Play Store Bundle (`app-release.aab`).
