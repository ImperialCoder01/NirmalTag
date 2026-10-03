<div align="center">
  <img src="assets/nirmaltag_logo.jpg" alt="NirmalTag Brand Logo" width="140" height="140" style="border-radius: 50%;" />
  <h1>NIRMALTAG — Mass-Scale Master Civic-Tech Platform</h1>
  <p><strong>"AI-Verified Sanitary & Special-Care Segregation with a Doorstep Circular-Credit Network"</strong></p>

  <p>
    <a href="https://nirmaltag.vercel.app"><img src="https://img.shields.io/badge/Live_Deployment-nirmaltag.vercel.app-0D5C3A?style=for-the-badge&logo=vercel" alt="Vercel Deployment" /></a>
    <a href="https://github.com/ImperialCoder01/NirmalTag/releases"><img src="https://img.shields.io/badge/Android_APK-NirmalTag.apk_v1.0.0-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android APK Release" /></a>
    <a href="https://github.com/ImperialCoder01/NirmalTag/blob/main/docs/SECURITY.md"><img src="https://img.shields.io/badge/Compliance-DPDP_Act_2023-0284C7?style=for-the-badge" alt="DPDP Act 2023 Compliant" /></a>
  </p>
</div>

---

NirmalTag is a production-grade, secure, offline-first civic-tech platform designed for municipal and urban waste management systems (MCD, RWAs, BWGs). It combines tamper-evident waste pouch QR tracking, on-device AI visual evidence verification, atomic double-entry economic reward ledgers, and multi-tier role-based access control (RBAC + RLS).

---

## 🏛️ Platform Architecture Overview

NirmalTag operates as a unified monorepo:

```
NirmalTag/
├── android/            # Native Kotlin + Jetpack Compose + CameraX + TFLite + Room + WorkManager
├── web/                # Next.js 14 App Router + TypeScript + Tailwind CSS (Live at https://nirmaltag.vercel.app)
├── supabase/           # PostgreSQL Migrations, Dynamic RLS Policies, Seed Data & Storage Policies
├── docs/               # System Specifications, Security Architecture, Threat Models & Guides
├── scripts/            # Database, CI/CD, and Batch Processing Helper Utilities
└── assets/             # Brand identity, logos, and visual design assets
```

### Core Technologies
- **Identity & Auth**: Firebase Authentication (Email/Password, Google Sign-In with Android Credential Manager & Web SDK)
- **Database & Storage**: PostgreSQL + Supabase (Row-Level Security, Third-Party Auth Sync, Private Evidence Buckets)
- **Mobile AI Engine**: On-Device MobileNetV3 TFLite Model for offline visual evidence verification
- **Web Platform**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Recharts

---

## 👤 User Roles & Key Capabilities

1. **HOUSEHOLD**: Register pouches, request doorstep collection, view single-use tag history, track earned credits, and redeem rewards catalog.
2. **COLLECTOR**: Offline-first mobile app scanner (`NirmalTag.apk`), automated QR lifecycle check, CameraX evidence capture, TFLite AI check, offline sync queue, and incentive wallet.
3. **TAG_OFFICER**: Web portal for mass batch tag creation, CSV export, inventory reconciliation, distribution, activation, and single-use status override.
4. **RWA_ADMIN / BWG_ADMIN**: Scoped residential & bulk waste generator compliance dashboards, collection rate metrics, daily commercial waste logging, and incident dispute reporting.
5. **MCD_OFFICER**: Ward executive command dashboard, ward compliance rate filtering, AI dispute review resolution queue, and ward broadcast advisories.
6. **SYSTEM_ADMIN**: System-wide provisioning, RBAC role assignment, policy engine management (credit rates, AI cutoffs), and security audit trail exporter.

---

## 🏷️ Single-Use Tag Lifecycle State Machine

```
CREATED ──► REGISTERED ──► IN_INVENTORY ──► ASSIGNED ──► ACTIVE
                                                            │
CLOSED ◄── VERIFIED ◄── PICKUP_PENDING ◄── SCANNED ─────────┘
```

> **Invariant**: A physical tag in `CLOSED` state can **NEVER** return to `ACTIVE`. Any duplicate scan attempt is authoritatively rejected server-side.

---

## 🚀 Quick Start & Installation

### Android Application (`NirmalTag.apk`)
- Download the prebuilt release APK from [GitHub Releases](https://github.com/ImperialCoder01/NirmalTag/releases/tag/v1.0.0).
- Location in repo build output: `android/app/build/outputs/apk/debug/NirmalTag.apk`

### Web Application (`https://nirmaltag.vercel.app`)
- Live deployment: [https://nirmaltag.vercel.app](https://nirmaltag.vercel.app)
- Local run:
  ```bash
  cd web
  npm install
  npm run dev
  ```

---

## 📚 Documentation Suite

- [`docs/ANTIGRAVITY_REQUIREMENTS.md`](docs/ANTIGRAVITY_REQUIREMENTS.md) — Mandatory External Configuration & Credentials Guide
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Technical & System Design Specifications
- [`docs/DATABASE.md`](docs/DATABASE.md) — PostgreSQL Schema & Entity Relationship Diagrams
- [`docs/RLS.md`](docs/RLS.md) — Supabase Security & Row Level Security Policies
- [`docs/SECURITY.md`](docs/SECURITY.md) — Threat Model, Attack Surface & OWASP Compliance
- [`docs/TAG_LIFECYCLE.md`](docs/TAG_LIFECYCLE.md) — Tag Lifecycle State Machine & Invariants

---

## 📄 License & Attribution

NirmalTag Civic Tech Platform © 2026. Built for municipal civic-tech compliance and environmental sustainability.
