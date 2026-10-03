# NIRMALTAG — ITERATION 9.2: ACTUAL COLLECTOR USER-JOURNEY E2E AUDIT REPORT

**Status**: PROVISIONALLY COMPLETED & AUDITED  
**Execution Environment**: Android Emulator (`emulator-5554` / `Medium_Phone_API_37.0`, API 37, ABI `x86_64`)  
**Target Package**: `com.nirmaltag.app`  
**Git Commit**: `c96e69d885d057132a79d1bc2ee8826bd06dfc23`  
**Date**: October 4, 2026  

---

## 1. Executive Summary

Iteration 9.2 evaluated the actual Collector user-journey workflow on `emulator-5554` using strict forensic classification rules (`PASS`, `FAIL`, `BLOCKED`, `NOT EXECUTED`).

- **Proven on Device**: Application installation, launch, Compose UI rendering (Intro, Role Auth, Collector Dashboard), manual invalid QR validation, Room local queue persistence across process death, WorkManager sync trigger, network toggle queue reconciliation, and log security compliance.
- **Environment Blockers**: Live Firebase Auth $\to$ Supabase third-party token exchange on device is unavailable without live mobile Firebase test credentials (`AUTHENTICATION = BLOCKED`). Live physical QR scanning via camera frame capture is blocked by emulator camera hardware limitation (`CAMERA = BLOCKED BY ENVIRONMENT`). Online pickup submission, duplicate crediting checks, and live database balance delta reconciliation are blocked by the authentication and live QR physical scan prerequisites.

---

## 2. Iteration 9.2 E2E Final Report Matrix

| Test Case | Status | Actual Empirical Evidence |
|---|---|---|
| **Emulator** | **PASS** | `emulator-5554` active (`Medium_Phone_API_37.0`, API 37, `x86_64`) |
| **App installation** | **PASS** | `NirmalTag.apk` (30.5 MB) installed via ADB stream; verified `package:com.nirmaltag.app` |
| **Authentication** | **BLOCKED** | Live Firebase Auth $\to$ Supabase ID token exchange for Collector account unavailable on device |
| **Collector UI** | **PASS** | Rendered `AppIntroScreen`, `UserTypeAuthScreen`, and `RoleDashboardScreen` (Collector Wallet & Scanner UI) on device |
| **Camera** | **BLOCKED BY ENVIRONMENT** | CameraX preview view loads; emulator camera does not supply physical QR code input stream |
| **Valid QR** | **BLOCKED** | Dependent on live authenticated session and physical QR scanner input |
| **Invalid QR** | **PASS** | `TagValidationUtil` rejected `INVALID-123` with error banner in UI |
| **Online pickup** | **BLOCKED** | Blocked by live Collector authentication & physical QR camera input prerequisites |
| **Server reconciliation** | **BLOCKED** | Blocked by online pickup submission execution |
| **Duplicate submission** | **BLOCKED** | Blocked by online pickup submission execution |
| **Offline capture** | **PASS** | Captured evidence to Room DB (`PendingPickupEntity`) with state `WAITING_FOR_NETWORK` |
| **Process death** | **PASS** | `adb shell am force-stop com.nirmaltag.app` executed; pending Room queue records survived relaunch |
| **WorkManager sync** | **PASS** | `PickupSyncWorker.scheduleSync(context)` enqueued worker on background thread |
| **Network restoration** | **PASS** | Toggled `adb shell svc data disable/enable`; queue reconciliation handled without crash |
| **Multiple offline pickups** | **PASS** | Room database queued multiple `PendingPickupEntity` records with independent `idempotencyKey` UUIDs |
| **Auth failure** | **PASS** | Unauthenticated RPC calls fail-closed with `42501 Access Denied` on backend |
| **Log security** | **PASS** | Logcat audit confirmed zero credentials (`sbp_`, `SUPABASE_ACCESS_TOKEN`, `service_role`, `Bearer`, `password`) logged |

---

## 3. Test Suite & Build Verification Summary

- **Android unit tests**: 24 / 24 PASS (`.\gradlew.bat test`)
- **Android instrumentation**: 3 / 3 PASS (`.\gradlew.bat connectedDebugAndroidTest`)
- **Web tests**: 39 / 39 PASS (`node --test web/tests/*.test.mjs`)
- **Web build**: 28 routes compiled (`npm run build`)
- **APK**: `android/app/build/outputs/apk/debug/NirmalTag.apk` (30,520,931 bytes)
- **Git commit**: `c96e69d885d057132a79d1bc2ee8826bd06dfc23`
