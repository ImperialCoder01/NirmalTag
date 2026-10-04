# NIRMALTAG — ITERATION 16 FINAL STANDALONE RELEASE & DIRECT APK DISTRIBUTION READINESS

**Date**: October 4, 2026  
**Scope**: Standalone Release, Direct APK Distribution Readiness, Physical Hardware Sideload Verification, Test Credential Isolation, SHA-256 File Hash Integrity Audit  
**Target Hardware**: Physical Android Phone `PJ7POB99FE89BAWS` (OPPO A15s, Android 10, API 29) + Live Web Application + Hosted Supabase & Firebase Auth  
**Status**: DIRECT APK RELEASE — READY  

---

## 1. COMPREHENSIVE DISTRIBUTION AUDIT MATRIX

### A. ANDROID DIRECT APK DISTRIBUTION
| Requirement | Status | Verification Evidence & Runtime Details |
| :--- | :---: | :--- |
| **Build Pipeline** | **PASS** | `.\gradlew.bat assembleRelease` executed cleanly $\rightarrow$ generated `android/app/build/outputs/apk/release/NirmalTag.apk`. |
| **ADB Install / Sideload** | **PASS** | `adb install -r android/app/build/outputs/apk/release/NirmalTag.apk` executed on physical device `PJ7POB99FE89BAWS`. Result: `Success`. |
| **Physical Device Test** | **PASS** | Sideloaded release APK launched and executed cleanly on OPPO A15s (`PJ7POB99FE89BAWS`, Android 10, API 29). |
| **Authentication** | **PASS** | Firebase Email/Password Sign-In and Google Sign-In verified operational. |
| **Google Account Switching** | **PASS** | Account chooser opens natively without clearing app data (Account A $\rightarrow$ Sign Out $\rightarrow$ Account B chooser $\rightarrow$ Sign Out $\rightarrow$ Account A). |
| **Collector Flow** | **PASS** | CameraX frame capture + ML Kit barcode scanner auto-decodes physical tag `NT-SAN-2026-917501`. |
| **Offline Room Queue** | **PASS** | Evidence captured and persisted to local Room DB entity with status `WAITING_FOR_NETWORK`. |
| **WorkManager Sync** | **PASS** | `PickupSyncWorker` background sync enqueued with Firebase ID Token. |
| **Server Synchronization** | **PASS** | Supabase `pickup_transaction_rpc` executed: Tag `ACTIVE` $\rightarrow$ `CLOSED`; Household +10 credit pts; Collector +₹2.00. Idempotency verified. |
| **Security Controls** | **PASS** | RLS enforcement, double-entry reward policy, and role authorization guard verified. |

### B. WEB PRODUCTION READINESS
| Requirement | Status | Verification Evidence & Runtime Details |
| :--- | :---: | :--- |
| **Integration Test Suite** | **PASS** | `node --env-file=.env.local --test tests/*.test.mjs` passed **54/54** (0 failures). |
| **Production Build** | **PASS** | `npm run build` compiled **39 static/dynamic routes** cleanly without TypeScript or ESLint errors. |
| **Production Configuration**| **PASS** | `.env.local` contains strictly public client credentials (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). No `localhost` dependencies in prod paths. |
| **Deployment Readiness** | **PASS** | Web application production bundle ready for Vercel / Next.js hosting. |

### C. SECURITY & AUDIT ISOLATION
| Requirement | Status | Verification Evidence & Runtime Details |
| :--- | :---: | :--- |
| **Secrets Audit** | **PASS** | String search across `web/`, `android/`, and build artifacts confirms 0 hardcoded `service_role` keys, `sb_secret` management tokens, Supabase PATs, or Firebase private credentials. |
| **Test Credential Isolation** | **PASS** | `COLLECTOR_TEST_EMAIL` and `COLLECTOR_TEST_PASSWORD` are scoped strictly to `debug` build type. In `release` build type, test credentials compile to empty strings (`""`). |
| **APK String Inspection** | **PASS** | Extracted release strings verify zero embedded private keys or hardcoded passwords. |
| **Git Repository Safety** | **PASS** | `.gitignore` protects `.env.local`, `local.properties`, `*.keystore`, `*.jks`, and build outputs. |

### D. AI CLASSIFIER CAPABILITY
| Requirement | Status | Verification Evidence & Runtime Details |
| :--- | :---: | :--- |
| **Trained Model Asset** | **MODEL_UNAVAILABLE** | No domain-trained `.tflite` model asset present in `android/app/src/main/assets/`. `VisualVerificationEngine.kt` returns `MODEL_UNAVAILABLE` with `confidence = 0.0f` and `isModelAvailable = false`. |
| **AI Wording & UX Accuracy** | **PASS** | UX wording across web and mobile platforms uses honest, non-misleading terminology (*"AI verification unavailable"*, *"Visual verification"*). No fake confidence scores or mock classification outputs generated. |

### E. GOOGLE PLAY STORE STATUS (FUTURE CHANNEL)
| Requirement | Status | Verification Evidence & Runtime Details |
| :--- | :---: | :--- |
| **Play Store Signing** | **NOT CONFIGURED** | Optional future channel. Not required for direct APK distribution or physical device deployment. |
| **Play Store Publication** | **NOT CURRENTLY REQUIRED** | Google Play Store publication is not being pursued at this time. |

---

## 2. RELEASE ARTIFACT METRICS & SHA-256 CHECKSUMS

The following release artifacts were generated and verified. The SHA-256 checksums allow users to verify file integrity upon direct distribution:

### Direct Distribution Release APK (Primary Artifact)
- **File Name**: `NirmalTag.apk`
- **Absolute Path**: `d:\LOQ\Documents\WasteChakra\android\app\build\outputs\apk\release\NirmalTag.apk`
- **File Size**: `46,855,064 bytes` (~44.68 MB)
- **SHA-256 Checksum**:  
  `F249A146D6C613019FA628B2E0B323A754651D5DD19F7F2AF0193F54AE944319`

### Optional Play Store Bundle (Future Channel)
- **File Name**: `app-release.aab`
- **Absolute Path**: `d:\LOQ\Documents\WasteChakra\android\app\build\outputs\bundle\release\app-release.aab`
- **File Size**: `26,429,374 bytes` (~25.20 MB)
- **SHA-256 Checksum**:  
  `8EB15BD30F9EC275E461469E88999056694C2CCB4709F0EF23400EE938044F4E`

---

## 3. FINAL RELEASE VERDICT

```text
==================================================
           DIRECT APK RELEASE — READY
==================================================
```

### Summary:
- **Distribution Mode**: Direct Sideload APK Distribution & Web Production Deployment.
- **Physical Device**: OPPO A15s (`PJ7POB99FE89BAWS`, Android 10, API 29) verified fully operational.
- **Security & Privacy**: 0 secrets exposed, test credentials strictly isolated, DPDP Act 2023 compliant privacy & terms published.
- **Google Play Channel**: Configured as an optional future step when Play Store distribution is desired.
