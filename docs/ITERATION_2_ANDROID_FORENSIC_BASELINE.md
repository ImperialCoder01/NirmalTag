# ITERATION 2 — ANDROID PRODUCTION FORENSIC BASELINE AUDIT

**Date:** October 4, 2026  
**Application ID:** `com.nirmaltag.app`  
**Target:** Conversion of Android App into Production-Capable Offline-First Evidence Capture Client  

---

## 1. Project Component Inventory

| Component | Technical Specification | Current Status |
|---|---|---|
| **Application ID** | `com.nirmaltag.app` | Configured in `app/build.gradle.kts` |
| **Compile / Target SDK** | SDK 34 (Android 14) | Configured |
| **Min SDK** | SDK 26 (Android 8.0) | Configured |
| **Kotlin Version** | 1.9.22 | Configured in root `build.gradle.kts` |
| **Gradle Plugin** | 8.2.2 | Configured in root `build.gradle.kts` |
| **Java Toolchain** | Java 17 | JVM target set to 17 |
| **Jetpack Compose** | BOM `2024.02.00` / Compiler `1.5.8` | Active in `MainActivity` |
| **Firebase Auth** | `com.google.firebase:firebase-auth-ktx:33.1.0` | Present (`google-services.json` included) |
| **CameraX** | `1.3.1` (core, camera2, lifecycle, view) | Present |
| **Room Database** | `2.6.1` (runtime, ktx) | Present in dependencies; **Missing KSP plugin & Entity/DAO implementations** |
| **WorkManager** | `2.9.0` (runtime-ktx) | Present in dependencies; **Missing Worker implementation & Sync Queue** |
| **TensorFlow Lite** | `2.14.0` (core, support) | Present in dependencies; **Missing `.tflite` asset model file** |

---

## 2. Forensic Assessment of Current Implementation

1. **Local State & Storage:**
   - Currently relies on transient Compose `remember { mutableStateOf(...) }` inside `MainActivity.kt`.
   - App restart or process death wipes all un-synced pickup events.

2. **Room & WorkManager Gaps:**
   - Dependencies exist in `build.gradle.kts`, but KSP (`com.google.devtools.ksp`) compiler plugin is not configured.
   - Zero Room `@Entity`, `@Dao`, or `@Database` classes exist.
   - Zero WorkManager `CoroutineWorker` implementations exist.

3. **On-Device AI (TFLite) Gaps:**
   - [`com.nirmaltag.app.ai.VisionClassifier`](file:///d:/LOQ/Documents/WasteChakra/android/app/src/main/java/com/nirmaltag/app/ai/VisionClassifier.kt) contains hardcoded `val confidence = 0.94f`.
   - No actual `.tflite` model asset file exists in `android/app/src/main/assets/`.

4. **CameraX & Evidence Flow:**
   - Basic CameraX preview modal is defined inside `MainActivity.kt`, but lacks durable image file saving, photo hashing, or WorkManager queue integration.

---

## 3. Required Engineering Plan for Iteration 2

1. **Gradle KSP Configuration:** Add `id("com.google.devtools.ksp") version "1.9.22-1.0.17"` to `build.gradle.kts` and `app/build.gradle.kts`.
2. **Room Persistence Layer:** Implement `NirmalTagDatabase`, `PendingPickupEntity`, `PendingEvidenceEntity`, `TagCacheEntity`, `SyncQueueEntity`, `AuthSessionEntity`, `AiResultEntity`, and corresponding DAOs (`PickupDao`, `TagCacheDao`, `SyncQueueDao`).
3. **Offline State Machine:** Define strict `OfflinePickupState` enum (`CAPTURED`, `EVIDENCE_STORED`, `AI_CLASSIFIED`, `WAITING_FOR_NETWORK`, `UPLOADING`, `SYNC_COMPLETED`, `SYNC_REJECTED`, `SYNC_FAILED`).
4. **WorkManager Sync Worker:** Implement `PickupSyncWorker` with network constraint, exponential backoff, process-death recovery, and idempotency key persistence.
5. **Visual Verification Abstraction:** Refactor `VisionClassifier` into `VisualVerificationEngine` with `REAL_TFLITE` vs `MODEL_UNAVAILABLE` status, removing hardcoded `0.94f` confidence.
6. **Authentication & Supabase Client Integration:** Pass Firebase ID Token directly to Supabase REST Data API endpoint `/rest/v1/rpc/process_verified_pickup_transaction_v2` without storing administrative keys.
