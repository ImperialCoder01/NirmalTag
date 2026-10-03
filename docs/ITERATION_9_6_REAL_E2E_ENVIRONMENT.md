# ITERATION 9.6 — REAL E2E ENVIRONMENT PREPARATION & CHECKLIST

## Executive Summary
This document establishes the environment preparation checklist for NirmalTag Iteration 9.6. It specifies the requirements, security boundaries, and remaining environment blockers necessary to execute a truthful, authenticated Collector End-to-End (E2E) test on the Android emulator (`emulator-5554`) or a physical device.

---

## E2E Environment Checklist

| # | Item / Component | Status | Details / Diagnostic Evidence |
| :--- | :--- | :--- | :--- |
| **A** | **Firebase test account status** | **BLOCKED** | `BLOCKED — FIREBASE COLLECTOR TEST ACCOUNT REQUIRED`. No test email/password credentials configured in `android/local.properties`. |
| **B** | **Firebase UID → COLLECTOR role status** | **BLOCKED** | `BLOCKED — FIREBASE UID NOT MAPPED TO COLLECTOR`. Cannot query or verify role assignment without an authenticated Firebase user UID. |
| **C** | **Supabase Third-Party Auth status** | **BLOCKED** | Requires a valid, runtime-acquired Firebase RS256 ID Token passed as `Authorization: Bearer <token>` to Supabase. |
| **D** | **Safe test household status** | **BLOCKED** | No active assigned test household relationship exists in the live database (`ubphrqumpqdifupwbvpe`). |
| **E** | **Safe ACTIVE test tag status** | **BLOCKED** | `BLOCKED — SAFE ACTIVE TEST TAG REQUIRED`. Live Supabase `tags` table query returned 0 rows in `ACTIVE` state. |
| **F** | **Camera/QR test environment status** | **BLOCKED** | `emulator-5554` running in headless daemon mode lacks physical camera hardware scanning a printed QR code. |
| **G** | **Required local configuration** | **PASS** | `android/app/build.gradle.kts` updated to load `collector.test.email` and `collector.test.password` from git-ignored `android/local.properties`. |
| **H** | **Security checks** | **PASS** | `android/local.properties` verified in `.gitignore`. Zero secret keys or JWT strings committed (`git grep "eyJ"` = 0 matches). |
| **I** | **Exact remaining blockers** | **BLOCKED** | Four infrastructure/data prerequisites must be supplied before real E2E execution can succeed. |

---

## Required Local Configuration Instructions

To unblock the authenticated Collector E2E test, populate your local, git-ignored `android/local.properties` file with the following keys:

```properties
# android/local.properties (Git-ignored local test configuration)
sdk.dir=C\:\\Users\\LOQ\\AppData\\Local\\Android\\Sdk
supabase.publishable.key=sb_publishable_...
collector.test.email=your_collector_test_email@example.com
collector.test.password=your_collector_test_password
```

### Security Enforcement Rules:
1. **Never commit `local.properties`**.
2. **Never expose passwords or tokens** in Git commits, pull requests, or ChatGPT prompts.
3. **Never hardcode secrets** in Kotlin source or Gradle files.

---

## Required Database Test Fixture Plan

Before executing the real Collector transaction RPC (`process_verified_pickup_transaction_v2`), the following relational rows must exist in the live Supabase database (`ubphrqumpqdifupwbvpe`):

1. **User Profile & Collector Role**:
   - `auth.users`: User with Firebase UID `usr_collector_test_01`.
   - `public.profiles`: Profile record for `usr_collector_test_01`.
   - `public.user_roles`: Mapping `usr_collector_test_01` $\to$ `role = 'COLLECTOR'`.
2. **Household & Tag Assignment**:
   - `public.households`: Registered test household (e.g. `hh_test_ward42_01`).
   - `public.tags`: Tag serial `NT-SAN-2026-9999` with `status = 'ACTIVE'`, assigned to `hh_test_ward42_01`.

---

## Camera / QR Scanning Execution Steps for Real Device or Emulator

When executing the test on an actual device or GUI emulator:
1. **Physical Device**: Connect Android device with USB debugging enabled (`adb devices`), install debug APK (`gradlew assembleDebug`), launch camera scanner, and point camera at printed test QR tag.
2. **Emulator Virtual Camera**: Launch emulator with GUI (`emulator -avd Medium_Phone_API_37.0`), load test QR image into Emulator Camera Wall/Virtual Camera scene, position camera target reticle over QR image.

---
*Generated for NirmalTag Iteration 9.6 Environment Checklist.*
