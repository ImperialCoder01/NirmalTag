# ITERATION 9.17 — COLLECTOR WORKFLOW END-TO-END FORENSIC DISCOVERY REPORT

**Date:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Scope:** Android Collector Workflow Architecture & E2E Verification  

---

## 1. Architectural Component Map & Forensic Audit

| Component | File / Location | Implementation Status | Implementation Details |
|---|---|---|---|
| **Firebase Auth Flow** | `MainActivity.kt` (`UserTypeAuthScreen`) | **COMPLETE** | Uses `FirebaseAuth.getInstance().signInWithEmailAndPassword()`, obtains fresh ID token via `user.getIdToken(true)`. |
| **CameraX QR Scanner** | `MainActivity.kt` (`LiveCameraScannerModal`) | **COMPLETE** | `ProcessCameraProvider` + `PreviewView` + target reticle + camera permission launcher. |
| **QR Syntax Validation** | `TagValidationUtil.kt` | **COMPLETE** | Strict regex validation (`NT-[TYPE]-[YEAR]-[SERIAL]`). |
| **Evidence Capture** | `MainActivity.kt` | **COMPLETE** | Photo stored in app-private storage (`filesDir/pickups/photo_*.jpg`), SHA-256 digest calculated over image bytes. |
| **Visual Verification (AI)** | `VisualVerificationEngine.kt` | **COMPLETE (HONEST MODEL_UNAVAILABLE)** | Checks for `mobilenetv3_sanitary_quant.tflite` asset; correctly returns `MODEL_UNAVAILABLE` (0.0% fake confidence) when asset is missing. |
| **Room Local Queue** | `PendingPickupEntity.kt`, `PickupDao.kt` | **COMPLETE** | Stores pending pickups with state `WAITING_FOR_NETWORK`, `photoSha256`, `idempotencyKey`, GPS telemetry. |
| **WorkManager Sync** | `PickupSyncWorker.kt` | **COMPLETE** | Enqueues unique work `NirmalTagPickupSyncWork`, checks evidence SHA-256 hash, acquires fresh Firebase ID token, calls Supabase RPC. |
| **Server RPC Finalization** | `process_verified_pickup_transaction_v2` (PostgreSQL) | **COMPLETE & LIVE** | Receives authenticated Firebase token via PostgREST identity bridge, validates collector/tag/household, updates tag to `CLOSED`, awards +10 credits to household and +₹2.00 incentive to collector atomically. |

---

## 2. E2E Test Device & Environment Assessment (Phase 1)

- **Available Devices:** Android Emulator / Headless Test Environment.
- **Physical Camera Feed:** Physical camera hardware is unavailable in local execution.
- **Camera Test Status:** **`CAMERA E2E BLOCKED BY ENVIRONMENT`** (per Phase 1 rule: do not simulate camera QR scanning or manufacture a fake PASS; test all legitimate API, authentication, database, WorkManager, and RPC layers).

---

## 3. E2E Collector Test Fixture Definition (Phase 2)

- **Firebase Collector Account:** `nirmaltag.e2e.collector@gmail.com`
- **Firebase UID:** `X6k87mpP00gxkNq8yKn5b8laFvo1`
- **Collector Profile ID:** `00000000-0000-4000-a000-000000000096`
- **Collector Entity ID:** `00000000-0000-4000-a000-000000000095`
- **Organization ID:** `00000000-0000-4000-a000-000000000097` (`E2E_TEST_RWA_ORG`)
- **Ward ID:** `00000000-0000-4000-a000-000000000098` (`WARD_E2E_TEST`)
- **Household ID:** `00000000-0000-4000-a000-000000000093` (Resident Profile: `00000000-0000-4000-a000-000000000094`)

---

## 4. WorkManager & RPC Synchronization Mechanism

When the collector captures evidence:
1. `PendingPickupEntity` is inserted into Room DB with `state = WAITING_FOR_NETWORK`.
2. `PickupSyncWorker.scheduleSync(context)` triggers `OneTimeWorkRequest` with network constraints.
3. `PickupSyncWorker.doWork()` runs on `Dispatchers.IO`:
   - Validates file existence and SHA-256 hash (`verifyEvidenceIntegrity`).
   - Retrieves fresh Firebase ID Token via `FirebaseAuth.currentUser.getIdToken(true)`.
   - Sends HTTP `POST` request to `https://ubphrqumpqdifupwbvpe.supabase.co/rest/v1/rpc/process_verified_pickup_transaction_v2` with `Authorization: Bearer <idToken>`.
   - On `200 OK`: calls `pickupDao.markVerified()`, setting state to `SERVER_VERIFIED`.
   - On error: updates state to `SERVER_REJECTED` or `SYNC_FAILED` (with exponential backoff).
