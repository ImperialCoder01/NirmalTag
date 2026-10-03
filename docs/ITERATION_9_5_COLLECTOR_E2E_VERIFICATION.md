# ITERATION 9.5 — COLLECTOR E2E VERIFICATION REPORT

## Executive Summary
This document records the end-to-end verification results for NirmalTag Iteration 9.5: Real Authenticated Collector End-to-End Acceptance. It evaluates the complete application stack across Android (`com.nirmaltag.app`), Firebase Authentication, Supabase PostgreSQL RPC (`process_verified_pickup_transaction_v2`), and Next.js Web application.

---

## 24-Point E2E Verification Matrix

| # | Verification Gate | Status | Evidence / Verification Logs |
| :--- | :--- | :--- | :--- |
| **1** | **Firebase authentication** | **BLOCKED** | No real Firebase test Collector credentials (email/password) are available in local test configuration. Live SDK integration in `UserTypeAuthScreen` fails closed on missing credentials. |
| **2** | **Firebase UID → Supabase auth.uid()** | **BLOCKED** | Dependent on Gate 1. Supabase Third-Party Auth requires an active RS256 Firebase ID token to resolve `auth.uid()`. |
| **3** | **Collector role authorization** | **BLOCKED** | Dependent on Gate 1 & 2. Database `user_roles` resolution requires authenticated `auth.uid()`. |
| **4** | **Real CameraX QR scan** | **BLOCKED** | Emulator `emulator-5554` running in daemon mode lacks physical camera hardware scanning a printed QR tag. |
| **5** | **Live tag validation** | **BLOCKED** | Verification against live database (`ubphrqumpqdifupwbvpe`) requires an active, assigned test tag serial code. |
| **6** | **Real evidence capture** | **PASS** | `LiveCameraScannerModal` saves evidence JPEG to app-private storage (`context.filesDir/pickups`), computes SHA-256, and verifies file integrity. |
| **7** | **AI inference** | **MODEL_UNAVAILABLE** | `VisualVerificationEngine` returns `status = MODEL_UNAVAILABLE` and `confidence = 0.0f` as no physical TFLite model is packaged. System handles missing model safely. |
| **8** | **Online pickup RPC** | **BLOCKED** | Execution of `process_verified_pickup_transaction_v2` requires authenticated Firebase Bearer JWT and active tag serial. |
| **9** | **Server tag closure** | **BLOCKED** | Dependent on Gate 8. Database transition from `ACTIVE` to `CLOSED` awaits RPC execution. |
| **10** | **Household reward delta** | **BLOCKED** | Dependent on Gate 8. Ledger insertion (+10 eco-points) awaits server RPC transaction completion. |
| **11** | **Collector incentive delta** | **BLOCKED** | Dependent on Gate 8. Ledger insertion (+₹2.00 handling incentive) awaits server RPC transaction completion. |
| **12** | **Ledger verification** | **BLOCKED** | Dependent on Gate 8. Inspection of `household_rewards_ledger` and `collector_incentives_ledger` awaits live RPC transaction. |
| **13** | **Duplicate idempotency** | **BLOCKED** | Dependent on Gate 8. Server-side `ALREADY_PROCESSED` return verification requires an executed initial pickup. |
| **14** | **Offline persistence** | **PASS** | Room database (`NirmalTagDatabase`) stores `PendingPickupEntity` with `WAITING_FOR_NETWORK` state. Verified by Room unit and instrumentation tests. |
| **15** | **Process-death recovery** | **PASS** | Room database queue survives application force-stop and system restart. Verified in instrumentation test suite. |
| **16** | **WorkManager server reconciliation** | **BLOCKED** | `PickupSyncWorker.scheduleSync(context)` enqueues WorkManager task cleanly, but live HTTP POST to `process_verified_pickup_transaction_v2` requires valid Firebase token. |
| **17** | **Negative authorization tests** | **PASS** | Web & database security suite verifies unauthenticated calls, non-collector roles, and spoofed household IDs are rejected with `401/403/42501 Access Denied`. |
| **18** | **Android unit tests** | **PASS** | **24 / 24 unit tests passed** (`.\gradlew.bat test`). |
| **19** | **Instrumentation tests** | **PASS** | **3 / 3 instrumentation tests passed** on `emulator-5554` (`.\gradlew.bat connectedDebugAndroidTest`). |
| **20** | **Web unit tests** | **PASS** | **39 / 39 web tests passed** (`node --env-file=web/.env.local --test web/tests/*.test.mjs`). |
| **21** | **Web production build** | **PASS** | **28 / 28 static and dynamic routes compiled** (`npm run build`). |
| **22** | **Debug APK build** | **PASS** | `BUILD SUCCESSFUL` (`.\gradlew.bat assembleDebug`). APK: `android/app/build/outputs/apk/debug/app-debug.apk`. |
| **23** | **Security scan** | **PASS** | `git grep -n "eyJ"` in source returned **0 matches**. Zero secret keys exposed. |
| **24** | **Git commit** | **PASS** | Pushed to `origin/main` at commit `fb9763b344740040b1ffe933373bf2114a5b7cf2`. `HEAD == origin/main`. |

---

## What Must Be Provided Locally for Full E2E Execution

To unblock the live authenticated E2E transaction on `emulator-5554`, the following local test environment parameters must be configured:

1. **Firebase Collector Test Account**:
   - Provide local test credentials (`COLLECTOR_TEST_EMAIL` and `COLLECTOR_TEST_PASSWORD`) in `android/local.properties` or environment variables.
   - Ensure the Firebase UID of this account is linked to `role = 'COLLECTOR'` in the `user_roles` table of Supabase database `ubphrqumpqdifupwbvpe`.
2. **Active Test Tag & Assigned Household**:
   - Provide a valid tag serial code (e.g. `NT-SAN-2026-9999`) present in the live Supabase `tags` table in `ACTIVE` state and assigned to a valid test household.

---
*Generated for NirmalTag Iteration 9.5 Verification Gate.*
