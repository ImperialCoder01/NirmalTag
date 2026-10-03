# ITERATION 9.9 — REAL FIREBASE E2E COLLECTOR ACCOUNT VERIFICATION REPORT

## Executive Summary
This document records the runtime authentication and backend authorization verification results for NirmalTag Iteration 9.9. Using real credentials supplied in local git-ignored configuration (`android/local.properties`), the application performed authentic Firebase Authentication, acquired a fresh runtime RS256 Firebase ID token, and verified Supabase Third-Party Auth token decoding.

In strict compliance with security rules, zero secret keys or raw tokens were written to source files or Git history, zero pickup transaction RPCs (`process_verified_pickup_transaction_v2`) were executed, zero credit points were awarded, and no missing database roles were automatically created.

---

## 16-Point Verification Matrix (Items 1 through 16)

| # | Verification Gate | Status | Diagnostic Evidence / Log Summary |
| :--- | :--- | :--- | :--- |
| **1** | **Firebase authentication** | **PASS** | Authenticated successfully against Firebase Auth REST API (`signInWithPassword`). Real authenticated session established. |
| **2** | **Firebase UID obtained** | **PASS** | Real Firebase UID obtained (Masked UID: `X6k87m...`). |
| **3** | **Supabase Third-Party Auth** | **PASS** | Supabase REST API accepted the Firebase RS256 Bearer JWT and decoded the claims header. |
| **4** | **Firebase UID → Supabase auth.uid()** | **PASS** | PostgreSQL `get_auth_jwt_sub()` function returned `auth.uid()` matching Firebase UID `X6k87m...`. |
| **5** | **COLLECTOR role** | **BLOCKED** | `BLOCKED — FIREBASE UID EXISTS BUT COLLECTOR ROLE IS NOT MAPPED`. Live database query returned `user_roles` = `null` for this Firebase UID. |
| **6** | **Profile relationship** | **BLOCKED** | No profile record (`public.profiles`) exists in PostgreSQL for Firebase UID `X6k87m...`. |
| **7** | **Collector relationship** | **BLOCKED** | No collector record (`public.collectors`) exists in PostgreSQL for Firebase UID `X6k87m...`. |
| **8** | **Organization relationship** | **BLOCKED** | Dependent on Gate 7. `org_id` mapping is missing. |
| **9** | **Ward relationship** | **BLOCKED** | Dependent on Gate 7. `assigned_ward_id` mapping is missing. |
| **10** | **Security scan** | **PASS** | `git grep "eyJ"` clean in source (0 matches); zero passwords, tokens, or `service_role` keys committed. `local.properties` git-ignored. |
| **11** | **Android tests** | **PASS** | **24 / 24 unit tests passed** (`.\gradlew.bat test`). |
| **12** | **Web tests** | **PASS** | **39 / 39 web tests passed** (`node --env-file=web/.env.local --test web/tests/*.test.mjs`). |
| **13** | **Web build** | **PASS** | **28 / 28 static and dynamic routes compiled** (`npm run build`). |
| **14** | **APK build** | **PASS** | `BUILD SUCCESSFUL` (`.\gradlew.bat assembleDebug`). APK: `android/app/build/outputs/apk/debug/app-debug.apk`. |
| **15** | **Instrumentation tests** | **PASS** | **3 / 3 instrumentation tests passed** on `emulator-5554` (`.\gradlew.bat connectedDebugAndroidTest`). |
| **16** | **Exact remaining blockers** | **BLOCKED** | Four database role/fixture mapping prerequisites must be populated before executing live pickup transactions. |

---

## Detailed Findings & Diagnostic Summary

1. **Authentication & Third-Party Auth Integration**:
   - **Firebase Authentication**: Successfully authenticated `nirmaltag.e2e.collector@gmail.com` via Firebase Auth.
   - **Token Translation**: Supabase Third-Party Auth decoded the RS256 JWT signature using Firebase's public JWKS certificates and resolved `auth.uid()` to `X6k87m...`.

2. **Role & Relational Invariants (Why COLLECTOR is BLOCKED)**:
   - While the Firebase user exists, the PostgreSQL database (`ubphrqumpqdifupwbvpe`) lacks a corresponding row in `public.profiles` (`id` = `X6k87m...`) and `public.user_roles` (`user_id` = `X6k87m...`, `role_id` for `'COLLECTOR'`).
   - Per security rule #3, the client application did **NOT** attempt to bypass or invent role authorization.

---

## Exact Remaining Blockers Before Live Pickup Transaction

1. **Database Profile & Role Mapping**: Insert row into `public.profiles` (`id` = `X6k87m...`) and link `public.user_roles` to `role = 'COLLECTOR'`.
2. **Collector Entity**: Insert row into `public.collectors` (`user_id` = `X6k87m...`, `assigned_ward_id` = Ward 42 UUID).
3. **Household & Active Tag Fixtures**: Seed 1 test household (`E2E_TEST_HOUSEHOLD`) and 1 `ACTIVE` assigned tag (`NT-SAN-2026-9999`) in live Supabase DB.
4. **Camera QR Input**: Feed QR code image into Emulator Virtual Camera or run test on physical Android device.

---
*Generated for NirmalTag Iteration 9.9 Verification Gate.*
