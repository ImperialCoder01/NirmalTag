# NIRMALTAG — ITERATION 9 REAL ANDROID DEVICE / EMULATOR ACCEPTANCE REPORT

## Executive Summary
This document records the acceptance verification for **Iteration 9: Real Android Device / Emulator Acceptance + Collector Field E2E**.

Environment discovery via `adb devices` confirmed that **no physical Android device or running emulator was attached** at execution time. In accordance with Phase 0 instructions, runtime E2E scenarios dependent on a live device display are explicitly marked **NOT EXECUTED**, while all unit tests, static code security scans, live database integration RPC tests, and APK compilation suites have been fully executed.

---

## 1. Environment Discovery Baseline

| Parameter | Value / Finding | Notes |
| :--- | :--- | :--- |
| **DEVICE AVAILABLE** | **NO** | `adb devices` returned 0 attached physical devices. |
| **EMULATOR AVAILABLE** | **NO** | `adb devices` returned 0 running emulators. |
| **INSTRUMENTATION TESTS EXIST** | **YES** | Setup created in `android/app/src/androidTest/java/com/nirmaltag/app/CollectorWorkflowInstrumentationTest.kt`. |
| **APK Location** | `android/app/build/outputs/apk/debug/NirmalTag.apk` | Generated via `.\gradlew.bat assembleDebug`. |
| **APK Package ID** | `com.nirmaltag.app` | Version 1.0.0 (versionCode 1). |
| **APK File Size** | `30,520,931` bytes (~30.5 MB) | Debug build containing Room, CameraX, WorkManager, and TFLite runtimes. |
| **Execution Date** | 2026-10-04 | Local system time. |

---

## 2. Real Device / Emulator Acceptance Matrix

| Category | Status | Verification Detail / Cause |
| :--- | :--- | :--- |
| **AUTHENTICATION** | **NOT EXECUTED** | No physical device or running emulator attached to execute Firebase UI login. |
| **CAMERA** | **NOT EXECUTED** | No physical device or running emulator attached to initialize CameraX surface provider. |
| **QR SCAN** | **NOT EXECUTED** | No physical device or running emulator attached to process camera frames. |
| **ONLINE PICKUP** | **NOT EXECUTED** | No physical device attached; verified at server level via live DB test script `run_live_iteration7.mjs`. |
| **OFFLINE CAPTURE** | **NOT EXECUTED** | No physical device attached to trigger offline Airplane mode capture. |
| **PROCESS DEATH** | **NOT EXECUTED** | No physical device attached to execute `adb shell am force-stop`. Verified in unit tests. |
| **NETWORK RESTORATION** | **NOT EXECUTED** | No physical device attached. |
| **WORKMANAGER** | **NOT EXECUTED** | No physical device attached. |
| **DUPLICATE SUBMISSION** | **NOT EXECUTED** | No physical device attached. Server-side idempotency verified via live DB test suite. |
| **SERVER REJECTION** | **NOT EXECUTED** | No physical device attached. Server-side fail-closed rejection verified via live DB test suite. |
| **EVIDENCE INTEGRITY** | **PASS** | Source & Unit test verified (`verifyEvidenceIntegrity` in `PickupSyncWorker` & `FieldReliabilityAndSyncTest`). |
| **AUTH FAILURE** | **NOT EXECUTED** | No physical device attached. |
| **MULTIPLE OFFLINE PICKUPS** | **NOT EXECUTED** | No physical device attached. |
| **AI TRUTHFULNESS** | **PASS** | Source & Unit test verified: `VisualVerificationEngine` truthfully returns `MODEL_UNAVAILABLE` (0.0f confidence). |
| **LOG SECURITY** | **PASS** | Repository scan verified: 0 administrative secrets (`service_role`, `SUPABASE_ACCESS_TOKEN`, `sbp_`) in source or APK. |
| **DATABASE RECONCILIATION** | **PASS** | Live DB test verified: 1 verified pickup = 1 household credit + 1 collector incentive + CLOSED tag. |

---

## 3. Remaining Manual Steps for Real Device Execution

When a physical Android device or emulator is attached via USB/ADB:

1. **Attach Device**: Ensure `adb devices` shows the device serial number.
2. **Install APK**: Run `adb install -r android/app/build/outputs/apk/debug/NirmalTag.apk`.
3. **Launch Application**: Run `adb shell am start -n com.nirmaltag.app/.MainActivity`.
4. **Execute Manual Test Plan**: Follow all test procedures defined in `docs/ANDROID_FIELD_TEST_PLAN.md`.
5. **Run Instrumentation Suite**: Execute `.\gradlew.bat connectedAndroidTest` to run automated UI/Room instrumentation.
