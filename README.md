# NIRMALTAG — Mass-Scale Master Civic-Tech Platform

![NirmalTag Logo](assets/nirmaltag_logo.jpg)

**"AI-Verified Sanitary & Special-Care Segregation with a Doorstep Circular-Credit Network"**

NirmalTag is a production-grade, secure, offline-first civic-tech platform designed for municipal and urban waste management systems (MCD, RWAs, BWGs). It combines tamper-evident waste pouch QR tracking, on-device AI visual evidence verification, atomic double-entry economic reward ledgers, and multi-tier role-based access control (RBAC + RLS).

---

## 🏛️ Platform Architecture Overview

NirmalTag operates as a unified monorepo:

```
NirmalTag/
├── android/            # Native Kotlin + Jetpack Compose + CameraX + TFLite + Room + WorkManager
├── web/                # Next.js 14 App Router + TypeScript + Tailwind CSS (Vercel Deployable)
├── supabase/           # PostgreSQL Migrations, Dynamic RLS Policies, Seed Data & Storage Policies
├── docs/               # System Specifications, Security Architecture, Threat Models & Guides
├── scripts/            # Database, CI/CD, and Batch Processing Helper Utilities
└── assets/             # Brand identity, logos, and visual design assets
```

### Core Technologies
- **Identity & Auth**: Firebase Authentication (Email/Password, Google Sign-In with Android Credential Manager & Web SDK)
- **Database & Storage**: PostgreSQL + Supabase (Third-Party Auth Bridge, Row-Level Security, Private Evidence Buckets)
- **Mobile AI Engine**: On-Device MobileNetV3 TFLite Model for offline visual evidence verification
- **Web Portal**: Next.js App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts

---

## 👤 User Roles & Key Capabilities

1. **HOUSEHOLD**: Register pouches, request collection, view single-use tag history, track earned credits, and redeem rewards.
2. **COLLECTOR**: Offline-first mobile scanner, automated QR lifecycle check, CameraX evidence capture, on-device AI check, offline sync queue.
3. **TAG_OFFICER**: Web portal for batch tag creation, identifier import, inventory reconciliation, distribution, activation, and invalidation.
4. **RWA_ADMIN / BWG_ADMIN**: Scoped residential/bulk waste generator compliance dashboards, collection rate metrics, and dispute tracking.
5. **MCD_OFFICER**: Ward/Zone/City executive command dashboard, sanitary waste volume analytics, hotspot detection, audit trail.
6. **SYSTEM_ADMIN**: System-wide provisioning, dynamic role assignment, policy engine management, AI model deployment, system audit log.

---

## 🏷️ Single-Use Tag Lifecycle State Machine

```
CREATED ──► REGISTERED ──► IN_INVENTORY ──► ASSIGNED ──► ACTIVE
                                                            │
CLOSED ◄── VERIFIED ◄── PICKUP_PENDING ◄── SCANNED ─────────┘
```

> **Invariant**: A physical tag in `CLOSED` state can **NEVER** return to `ACTIVE`. Any duplicate scan attempt is authoritatively rejected server-side.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v18.x` or `v20.x`
- **JDK**: Java 17 (for Android Studio / Gradle)
- **Android Studio**: Ladybug / Koala or newer with SDK 34 (Android 14)
- **Supabase CLI**: `v1.x`

### Setup Steps

1. **Clone & Install Web Dependencies**:
   ```bash
   cd web
   npm install
   ```

2. **Configure Environment Variables**:
   Read [`docs/ANTIGRAVITY_REQUIREMENTS.md`](docs/ANTIGRAVITY_REQUIREMENTS.md) for details on setting up Firebase and Supabase credentials in `.env.local` and `android/app/google-services.json`.

3. **Run Web Development Server**:
   ```bash
   npm run dev
   ```

4. **Build & Run Android Application**:
   Open `android/` in Android Studio, sync Gradle, and run on emulator or connected device.

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

NirmalTag Civic Tech Platform © 2026. Built with precision and production security invariants.
