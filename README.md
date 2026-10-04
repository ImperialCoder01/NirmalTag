<div align="center">
  <img src="assets/nirmaltag_logo.jpg" alt="NirmalTag Brand Logo" width="140" height="140" style="border-radius: 50%;" />
  <h1>NIRMALTAG — Mass-Scale Master Civic-Tech Platform</h1>
  <p><strong>"Doorstep Circular-Credit Network & Visual Verification for Sanitary & Special-Care Waste"</strong></p>

  <p>
    <a href="https://nirmaltag.vercel.app"><img src="https://img.shields.io/badge/Live_Deployment-nirmaltag.vercel.app-0D5C3A?style=for-the-badge&logo=vercel" alt="Vercel Deployment" /></a>
    <a href="https://github.com/ImperialCoder01/NirmalTag/releases"><img src="https://img.shields.io/badge/Android_APK-NirmalTag.apk_v1.0.0-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android APK Release" /></a>
    <a href="docs/SECURITY.md"><img src="https://img.shields.io/badge/Compliance-DPDP_Act_2023-0284C7?style=for-the-badge" alt="DPDP Act 2023 Compliant" /></a>
  </p>
</div>

---

NirmalTag is a production-grade, offline-first civic-tech platform designed for municipal and urban waste management systems (MCD, RWAs, BWGs). It combines tamper-evident waste pouch QR tracking, on-device visual evidence verification, atomic double-entry economic reward ledgers, and multi-tier role-based access control across 7 canonical roles.

---

## 📦 Current Release (v1.0.0)

- **Version**: `1.0.0` (Version Code: `1`)
- **Application ID**: `com.nirmaltag.app`
- **Release Status**: **DIRECT APK RELEASE — READY**
- **Distribution Channel**: Direct APK / Sideload Distribution (Google Play Store is an optional future channel)

### Release Artifact Metrics & SHA-256 Checksums

| Artifact | File Name | File Size | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| **Release APK** (Primary) | `NirmalTag.apk` | `46,855,064 bytes` (~44.68 MB) | `F249A146D6C613019FA628B2E0B323A754651D5DD19F7F2AF0193F54AE944319` |
| **Release AAB** (Future Channel) | `app-release.aab` | `26,429,374 bytes` (~25.20 MB) | `8EB15BD30F9EC275E461469E88999056694C2CCB4709F0EF23400EE938044F4E` |

> **AI Capability Status**: `MODEL_UNAVAILABLE`. No trained domain-specific `.tflite` model asset is bundled in `android/app/src/main/assets/`. Visual evidence verification operates via visual photo inspection without claiming trained AI inference.

---

## 🏛️ Platform Architecture Overview

NirmalTag operates as a unified monorepo:

```text
NirmalTag/
├── android/            # Native Kotlin + Jetpack Compose + CameraX + ML Kit + Room + WorkManager
├── web/                # Next.js 14 App Router + TypeScript + Tailwind CSS (39 Prerendered Routes)
├── supabase/           # PostgreSQL Migrations, Dynamic RLS Policies, Database Functions
├── docs/               # Architecture, Security, AI, User Guides, Installation & Release Notes
├── scripts/            # Database, CI/CD, and Batch Processing Helper Utilities
└── assets/             # Brand identity, logos, and visual design assets
```

### Core Technologies
- **Identity & Auth**: Firebase Authentication (Email/Password, Google Sign-In with Android Credential Manager & Web SDK). Seamless Google Account Switching supported on physical devices without wiping app data.
- **Database & Identity Bridge**: Hosted Supabase PostgreSQL + Row-Level Security (RLS). Firebase ID Tokens mapped cryptographically via `auth.jwt() -> 'sub'`.
- **Mobile Runtime**: Native Kotlin, Android SDK 34, CameraX, ML Kit Barcode Scanning, Room DB offline queueing, WorkManager network synchronization.
- **Web Platform**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons.

---

## 👤 7 Canonical User Roles

1. **`HOUSEHOLD`**: Register pouches, request doorstep collection, view tag history, track earned credit points, and redeem rewards catalog.
2. **`COLLECTOR`**: Offline-first mobile app scanner (`NirmalTag.apk`), automated QR lifecycle check, CameraX evidence capture, Room queue, WorkManager sync, and incentive wallet (+₹2.00/pickup).
3. **`TAG_OFFICER`**: Web portal for batch tag creation (1 to 5,000 tags), inventory search, household assignment, and tag replacement.
4. **`RWA_ADMIN`**: Residential Welfare Association dashboard, colony directory, Segregation Compliance Index (%) calculations, and ward incident reporting.
5. **`BWG_ADMIN`**: Bulk Waste Generator daily waste volume logging (Sanitary & Special-Care), seal verification, and MCD compliance certificate generation.
6. **`MCD_OFFICER`**: Municipal Corporation of Delhi executive command dashboard, ward telemetry filtering, and visual verification dispute resolution.
7. **`SYSTEM_ADMIN`**: System-wide user directory search, RBAC role assignment (`assign_user_role` RPC), and system audit log history.

---

## 🏷️ Single-Use Tag Lifecycle State Machine

```text
CREATED ──► REGISTERED ──► IN_INVENTORY ──► ASSIGNED ──► ACTIVE
                                                            │
CLOSED ◄── VERIFIED ◄── PICKUP_PENDING ◄── SCANNED ─────────┘
```

> **Invariant**: A physical tag in `CLOSED` state can **NEVER** return to `ACTIVE`. Any duplicate scan attempt is authoritatively rejected server-side (`ALREADY_PROCESSED`).

---

## 🚀 Quick Start & Installation

### Android Application Sideloading
- Download `NirmalTag.apk` from the repo output: `android/app/build/outputs/apk/release/NirmalTag.apk`.
- See the complete installation guide: [`docs/ANDROID_INSTALLATION.md`](docs/ANDROID_INSTALLATION.md).

### Web Application
- Production deployment: [https://nirmaltag.vercel.app](https://nirmaltag.vercel.app)
- Local setup:
  ```bash
  cd web
  npm install
  npm test          # Runs 54/54 integration tests
  npm run build     # Builds 39 routes
  npm run dev
  ```

---

## 📚 Documentation Suite

- [`docs/ANDROID_INSTALLATION.md`](docs/ANDROID_INSTALLATION.md) — Direct APK Installation & Checksum Guide
- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — Comprehensive 7-Role User Manual
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Technical Architecture & Monorepo Design
- [`docs/SECURITY.md`](docs/SECURITY.md) — Security Architecture & DPDP Act 2023 Compliance
- [`docs/AI.md`](docs/AI.md) — AI Capability Status & Visual Verification Policy
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Web & Android Production Deployment Specifications
- [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) — Official v1.0.0 Release Notes
- [`CHANGELOG.md`](CHANGELOG.md) — Platform Change Log

---

## 📄 License & Attribution

NirmalTag Civic Tech Platform © 2026. Built for municipal civic-tech compliance and environmental sustainability.
