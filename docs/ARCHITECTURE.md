# NIRMALTAG — System Architecture & Technical Design

## System Architecture Overview

NirmalTag is structured around an offline-first mobile scanning application for collectors and a responsive multi-role web platform for Households, Tag Officers, RWAs, BWGs, MCD Municipal Officers, and System Administrators.

```mermaid
flowchart TD
    subgraph Mobile Client (Android)
        A1[Jetpack Compose UI] --> A2[CameraX Scanner]
        A2 --> A3[On-Device AI Engine - MobileNetV3]
        A3 --> A4[Room Local Storage]
        A4 --> A5[WorkManager Sync Engine]
    end

    subgraph Web Platform (Next.js 14)
        W1[Household Portal]
        W2[Tag Officer Portal]
        W3[RWA / BWG Dashboard]
        W4[MCD Municipal Dashboard]
        W5[System Admin Control]
    end

    subgraph Authentication Gate
        FA[Firebase Authentication]
    end

    subgraph Authoritative Backend (Supabase / PostgreSQL)
        API[Supabase REST / PostgREST Engine]
        RLS[Row Level Security Engine]
        DB[(PostgreSQL Database)]
        ST[Supabase Private Evidence Storage]
    end

    A5 -->|HTTPS / JWT| FA
    W1 & W2 & W3 & W4 & W5 -->|HTTPS / JWT| FA
    FA -->|Signed Firebase JWT| API
    API --> RLS
    RLS --> DB
    A2 -->|Encrypted Evidence Upload| ST
```

---

## Technical Stack & Architectural Decisions

### 1. Mobile (Android Native)
- **Language**: Kotlin 1.9+
- **UI Framework**: Jetpack Compose + Material 3 Design System
- **State Management**: ViewModel + StateFlow + Coroutines
- **Scanner**: CameraX + Google Code Scanner / ML Kit Vision
- **On-Device Vision**: TensorFlow Lite (MobileNetV3 quantized visual evidence classifier)
- **Persistence**: Room Database + EncryptedSharedPreferences
- **Offline Sync**: Android WorkManager with exponential backoff & network constraints

### 2. Web Platform (Next.js)
- **Framework**: Next.js 14 (App Router, React Server Components)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + Shadcn/UI component primitives
- **Data Viz**: Recharts / Chart.js for municipal compliance & aggregate trends
- **Deployment**: Vercel Edge / Serverless functions

### 3. Database & Security
- **Database**: PostgreSQL 15+ hosted on Supabase
- **Identity Provider**: Firebase Auth (Email/Password & Google OAuth)
- **Authorization**: Row Level Security (RLS) policies mapping Firebase user UIDs to PostgreSQL role permission scopes.
- **Storage**: Supabase Storage with bucket-level private RLS policies and signed short-lived URLs.
