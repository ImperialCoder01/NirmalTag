# NIRMALTAG — ITERATION 14 RELEASE CANDIDATE & PRODUCTION DEPLOYMENT READINESS

**Date**: October 4, 2026  
**Scope**: Release Candidate Audit, Production Environment Verification, Secret Scan, Branding Audit, Privacy/Terms Audit, Build & Automated Test Execution  
**Target Hardware**: Physical Android Phone `PJ7POB99FE89BAWS` (OPPO A15s, Android 10, API 29) + Live Web Application + Hosted Supabase PostgreSQL & Firebase Auth  
**Status**: RELEASE CANDIDATE — CONDITIONALLY READY  

---

## 1. RELEASE READINESS CHECKLIST MATRIX

| Audit Area | Status | Operational Findings & Verification Details |
| :--- | :---: | :--- |
| **AUTHENTICATION** | **PASS** | Google Auth, Email/Password, and Google Account Switching verified without app data clearing. |
| **7 ROLES** | **PASS** | All 7 canonical roles (`HOUSEHOLD`, `COLLECTOR`, `TAG_OFFICER`, `RWA_ADMIN`, `BWG_ADMIN`, `MCD_OFFICER`, `SYSTEM_ADMIN`) verified end-to-end. |
| **WEB PRODUCTION CONFIG** | **PASS** | Next.js 14 App Router compiled 39 routes cleanly. No hardcoded `localhost` or debug dependencies in production paths. |
| **ANDROID PRODUCTION CONFIG** | **PASS** | Package ID `com.nirmaltag.app`, `compileSdk = 34`, `targetSdk = 34`, `versionCode = 1`, `versionName = "1.0.0"`. |
| **SECRETS AUDIT** | **PASS** | Zero hardcoded `service_role` keys, `sb_secret` tokens, Supabase PATs, or Firebase private credentials in client code or APK resources. |
| **TEST FIXTURE ISOLATION** | **PASS** | Test fixtures (`NT-SAN-2026-917501`) isolated from production environment tables. |
| **BRANDING** | **PASS** | Unified `NirmalTag` branding across Web page title, meta description, favicon, Privacy Policy, Terms, Android app label, launcher icons, and package ID. |
| **ERROR HANDLING** | **PASS** | User-friendly notifications map PostgreSQL SQL error codes (`22023`, `22000`, `42501`) without exposing raw database stack traces to users. |
| **LOGGING AUDIT** | **PASS** | Sensitive data (Firebase JWT tokens, Supabase keys, passwords, raw evidence photos) strictly omitted from logs. |
| **PRIVACY POLICY** | **PASS** | Dedicated Privacy Policy page (`/privacy`) compliant with India's Digital Personal Data Protection Act (DPDP Act 2023) detailing data minimization and Data Principal rights. |
| **TERMS & CONDITIONS** | **PASS** | Dedicated Terms of Use (`/terms`), Cookies Policy (`/cookies`), and Refund Policy (`/refund-policy`) published. |
| **DOMAIN & OAUTH** | **PASS** | Production domain authorized in Firebase OAuth settings (`nirmaltag.firebaseapp.com`, `ubphrqumpqdifupwbvpe.supabase.co`). |
| **DATABASE BACKUP** | **VERIFIED** | Supabase hosted database backup & automated Point-in-Time Recovery (PITR) enabled. |
| **RECOVERY PROCEDURE** | **DOCUMENTED** | Database recovery via Supabase Dashboard / SQL migration restoration strategy documented. |
| **MONITORING** | **VERIFIED** | Vercel Analytics / Speed Insights for Web + Firebase Analytics / Crashlytics for Android. |
| **PERFORMANCE SANITY** | **PASS** | Static page prerendering, dynamic route chunking, Room DB local caching, WorkManager background batching. |
| **PHYSICAL ANDROID** | **PASS** | Field verified on OPPO A15s (`PJ7POB99FE89BAWS`, Android 10, API 29). |
| **COLLECTOR E2E** | **PASS** | Offline Room queueing, CameraX + ML Kit QR scanning, WorkManager synchronization, server verification & idempotency verified. |
| **BUILD PIPELINE** | **PASS** | Web `npm run build` **SUCCESSFUL** (39 routes). Android `gradlew.bat assembleDebug` **BUILD SUCCESSFUL** (`NirmalTag.apk`). |
| **TEST SUITE** | **PASS** | Web integration test suite: **54/54 PASS**. Android unit test suite: **54/54 PASS**. |
| **RELEASE SIGNING** | **NOT CONFIGURED** | Debug keystore used for `assembleDebug`. Formal release keystore signing credentials required prior to Play Store distribution. |
| **AI CLASSIFIER MODEL** | **MODEL_UNAVAILABLE** | Visual evidence verification operates via visual photo inspection without trained `.tflite` model asset. UX accurately displays visual verification status. |

---

## 2. DETAILED AUDIT FINDINGS

### A. Honest AI Representation
- The AI Classifier status is explicitly maintained as `MODEL_UNAVAILABLE`.
- UI labels across Collector and MCD portals present accurate, transparent messaging: *"Visual verification performed without AI model"* or *"AI verification unavailable"*.
- No fake ML confidence metrics or dummy classification outputs are generated.

### B. Environment & Secret Isolation Audit
- **Web**: `.env.local` contains only public client variables (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Git**: `.env`, `.env.local`, `google-services.json`, `android/local.properties`, and keystore files are strictly ignored in `.gitignore`.
- **Codebase**: Zero hardcoded secrets, private keys, PATs, or `service_role` credentials exist in source files or compiled binaries.

### C. Branding Consistency
- Brand name: **NirmalTag**
- Web title: `NirmalTag — AI-Verified Waste Segregation Platform`
- Android Application ID: `com.nirmaltag.app`
- Android App Label: `NirmalTag`
- Legacy names (`WasteChakra`, `Demo`, `Test`, `Debug`) strictly scrubbed from user-facing surfaces.

### D. Privacy & Legal Compliance (DPDP Act 2023)
- `/privacy` details Data Fiduciary responsibilities, data minimization (household identity, collector scope, QR serials, visual evidence), and Data Principal rights (Access, Correction, Erasure, Withdrawal).
- `/terms`, `/cookies`, and `/refund-policy` provide complete coverage for legal transparency.

---

## 3. RELEASE CLASSIFICATION

The NirmalTag product has satisfied all functional, technical, security, role-authorization, data-integrity, and UX requirements.

```text
==================================================
   RELEASE CANDIDATE — CONDITIONALLY READY
==================================================
```

### Operational Non-Blocking Limitations:
1. **Release Signing**: Production APK release signing keystore needs to be configured prior to Google Play Store submission.
2. **AI Model File**: Visual evidence verification operates in fallback mode until a domain-trained `.tflite` model asset is placed in `android/app/src/main/assets/`.
