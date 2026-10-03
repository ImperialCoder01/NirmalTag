# NIRMALTAG — External Services & Credentials Configuration Guide

This document lists all external configurations, API keys, and console actions required to run NirmalTag in development, preview, and production environments.

> [!IMPORTANT]
> **NEVER** share private service keys, database passwords, or secret keys in chat or commit them into version control. Follow the exact instructions below to enter credentials into local `.env` files and secure project settings.

---

## 1. Firebase Authentication Setup

### Purpose
Provides unified identity management for Households, Collectors, Tag Officers, RWA/BWG Admins, MCD Officers, and System Administrators via Email/Password and Google Sign-In.

### Step-by-Step Instructions

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/).
   - Click **Add project** and name it `NirmalTag-Dev` (or `NirmalTag-Prod`).
   - Enable or disable Google Analytics as preferred.

2. **Enable Authentication Providers**:
   - In Firebase Console, go to **Build** → **Authentication** → **Sign-in method**.
   - Enable **Email/Password** sign-in.
   - Enable **Google** sign-in:
     - Set Support Email.
     - Note down the **Web Client ID** generated under Web SDK configuration.

3. **Register Web App**:
   - Click **Add app** (Web `</>`).
   - App nickname: `NirmalTag Web`.
   - Copy the Firebase Web configuration object:
     - `apiKey`
     - `authDomain`
     - `projectId`
     - `storageBucket`
     - `messagingSenderId`
     - `appId`
   - Paste these values into `web/.env.local`.

4. **Register Android App**:
   - Click **Add app** (Android icon).
   - Package name: `com.nirmaltag.app`
   - App nickname: `NirmalTag Android`.
   - Debug SHA-1 fingerprint (obtain by running `./gradlew signingReport` in `android/`).
   - Download `google-services.json`.
   - Place `google-services.json` into `android/app/google-services.json`.

---

## 2. Supabase PostgreSQL & Storage Setup

### Purpose
Provides authoritative relational database storage, Row-Level Security (RLS), single-use tag state validation, double-entry credit ledger, and private evidence storage.

### Step-by-Step Instructions

1. **Create Supabase Project**:
   - Go to [Supabase Dashboard](https://database.supabase.com/).
   - Click **New Project** and name it `NirmalTag`.
   - Choose a secure Database Password (store safely).

2. **Retrieve API Keys**:
   - In Supabase Dashboard, go to **Project Settings** → **API**.
   - Copy:
     - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
     - **anon / public key**
   - Place into `web/.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

3. **Configure Third-Party Firebase Authentication in Supabase**:
   - In Supabase Dashboard, go to **Authentication** → **Providers** → **Third-Party Auth** (or JWT Settings).
   - Add Firebase as an external JWT issuer:
     - Issuer URL: `https://securetoken.google.com/<YOUR_FIREBASE_PROJECT_ID>`
     - JWT Secret / Key URI: Firebase public keys endpoint.
   - This allows Supabase RLS to inspect Firebase JWT tokens directly (`auth.uid()`).

4. **Apply Database Migrations**:
   - Run the provided SQL migrations from `supabase/migrations/` using Supabase CLI or the SQL Editor in Supabase Dashboard.

---

## 3. Environment Variables Reference Checklist

| Variable Name | Description | Source | Where to Place | Secret or Public |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console | `web/.env.local` | PUBLIC |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Firebase Console | `web/.env.local` | PUBLIC |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | Firebase Console | `web/.env.local` | PUBLIC |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App ID | Firebase Console | `web/.env.local` | PUBLIC |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard | `web/.env.local` | PUBLIC |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Supabase Dashboard | `web/.env.local` | PUBLIC |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role | Supabase Dashboard | Vercel Server Environment ONLY | **SECRET** |

---

## 4. Current Status Checklist

- [x] Monorepo structure initialized
- [x] Documentation & Spec requirements defined
- [ ] Firebase Project creation (User action)
- [ ] Supabase Project creation (User action)
- [ ] Database migration execution (Phase 3)
- [ ] Web application setup & Vercel link (Phase 7)
- [ ] Android debug build sync (Phase 9)
