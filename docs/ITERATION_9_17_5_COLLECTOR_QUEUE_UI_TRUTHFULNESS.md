# ITERATION 9.17.5 — COLLECTOR PENDING QUEUE STATE & UI TRUTHFULNESS REPORT

**FINAL VERDICT**: **COLLECTOR QUEUE UI — PASS**  
**Date**: 2026-10-04  
**Target Hardware**: `PJ7POB99FE89BAWS` (OPPO A15s / CPH2179, Android 10, API 29, Online)  
**Fresh Test Tag Serial**: `NT-SAN-2026-917501` (Tag UUID: `7395af71-1ab1-44c9-967a-9be9da7cce02`)  
**Room Local Pickup ID**: `5dfca6e7-34e2-4989-a865-003367d32578`  
**Server Transaction Result**: `SUPABASE-TXN-505fc567`  

---

## 1. Forensic Audit & Root Cause Analysis

### Identified Root Causes:
1. **DAO Query Exclusion of In-Flight State (`UPLOADING`)**:
   `PickupDao.getPendingCountFlow()` previously queried `WHERE state IN ('LOCAL_CAPTURED', 'LOCAL_AI_COMPLETED', 'WAITING_FOR_NETWORK', 'SYNC_FAILED')`.
   When a pickup was saved and `PickupSyncWorker` executed, line 46 of `PickupSyncWorker.kt` immediately updated state to `UPLOADING`. Because `UPLOADING` was omitted from `IN (...)`, Room's count dropped to 0 instantly while uploading was active.
   *Fix*: Updated `PickupDao` to count all non-terminal states (`WHERE state NOT IN ('SERVER_VERIFIED', 'SERVER_REJECTED')`).

2. **Immediate Eager Sync Trigger on Save Button**:
   `PickupSyncWorker.scheduleSync(context)` was previously invoked synchronously inside the "Save to Queue" button handler. This caused WorkManager to immediately upload the pickup before the user could visually observe the `1 pending` queue state on screen.
   *Fix*: Decoupled queue saving from manual sync triggering. Saving inserts the entity into Room (`WAITING_FOR_NETWORK`), reactively updating Compose UI to `1 pickup waiting to sync`. Sync is executed when the user taps **Sync 1 Pickup** (or during scheduled background work).

3. **Misleading Action Message Banner**:
   Clicking sync previously set `actionMessage` to `"WorkManager sync triggered. Room database queue is up to date (0 pending)."` even if 0 pending was transient.
   *Fix*: Replaced static string with state-aware reactive indicator banner:
   - 0 Pending: `"All pickups synced"` (Sync button: `"Sync Pickup Queue"`, disabled)
   - 1 Pending: `"1 pickup waiting to sync"` (Sync button: `"Sync 1 Pickup"`, enabled)
   - $N$ Pending: `"$N pickups waiting to sync"` (Sync button: `"Sync $N Pickups"`, enabled)
   - Syncing: `"Syncing $N pickup(s)..."`

---

## 2. Diagnostics Log Evidence

All 8 required diagnostic tags were added and verified:

| Diagnostic Log Tag | Logged Parameters & Evidence | Output Verification |
| :--- | :--- | :---: |
| `NT_QUEUE_SCAN_SUCCESS` | Logged tag serial code `NT-SAN-2026-917501` upon CameraX ML Kit optical decoding. | **VERIFIED** |
| `NT_QUEUE_EVIDENCE_CAPTURED` | Logged evidence photo file path `/data/user/0/com.nirmaltag.app/files/pickups/photo_...jpg` & SHA-256 hash. | **VERIFIED** |
| `NT_QUEUE_ENTITY_CREATED` | Logged constructed entity `localPickupId=5dfca6e7-...` & initial state `WAITING_FOR_NETWORK`. | **VERIFIED** |
| `NT_QUEUE_ENTITY_INSERTED` | Logged Room insertion completion for `localPickupId=5dfca6e7-...`. | **VERIFIED** |
| `NT_QUEUE_COUNT_UPDATED` | Logged Flow reactive count update: `0` $\rightarrow$ `1` $\rightarrow$ `0`. | **VERIFIED** |
| `NT_QUEUE_SYNC_STARTED` | Logged WorkManager start with pending count `1`. | **VERIFIED** |
| `NT_QUEUE_SYNC_RESULT` | Logged server RPC success `SUPABASE-TXN-505fc567`. | **VERIFIED** |
| `NT_QUEUE_COUNT_AFTER_SYNC` | Logged Room pending count post-reconciliation (`0`). | **VERIFIED** |

---

## 3. Physical Device Queue & UI State Verification Table

| Stage | Physical Device Action | Room DB Pending Count | Compose Displayed Count | UI Banner & Button Text | Result |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **A** | Initial Launch | `0` | `0` | `"All pickups synced"`, button: `"Sync Pickup Queue"` | **MATCH** |
| **B** | Scan `NT-SAN-2026-917501` | `0` | `0` | Scanned tag validated | **MATCH** |
| **C** | Save to Queue | `1` | `1` | **`"1 pickup waiting to sync"`**, button: **`"Sync 1 Pickup"`** | **MATCH** |
| **D** | Pre-Sync Pause | `1` | `1` | Count remains 1 until Sync button is tapped | **MATCH** |
| **E** | Tap **Sync 1 Pickup** | `1` $\rightarrow$ `0` | `1` $\rightarrow$ `0` | `"Syncing 1 pickup..."` $\rightarrow$ **`"All pickups synced"`** | **MATCH** |

---

## 4. Room Database WAL & Relational Forensics

Extracted from `/data/data/com.nirmaltag.app/databases/nirmaltag_offline.db` on device `PJ7POB99FE89BAWS`:

```text
('323af3ef-bd2d-4722-90fa-fbfbfa008386', '1abb5859-21d4-49e0-b627-b6832b9fe795', 'NT-SAN-2026-917402', 'SERVER_VERIFIED', 'SUPABASE-TXN-1abb5859')
('5dfca6e7-34e2-4989-a865-003367d32578', '505fc567-6969-4a11-b352-c5c9b80be99a', 'NT-SAN-2026-917501', 'SERVER_VERIFIED', 'SUPABASE-TXN-505fc567')
```

- **Room Pending Count**: `0`
- **Compose UI Displayed Count**: `0`
- **Match Status**: **MATCH 100%**

---

## 5. Unit & Regression Tests

Unit test suite `CollectorQueueStateTest` executed:
- `testEmptyQueue_returnsZeroCount`: **PASS**
- `testOneWaitingForNetwork_returnsCountOne`: **PASS**
- `testTwoPendingPickups_returnsCountTwo`: **PASS**
- `testServerVerified_excludedFromPendingCount`: **PASS**
- `testServerRejected_excludedFromPendingCount`: **PASS**
- `testSyncSuccess_reducesPendingCount`: **PASS**
- `testSyncFailure_retainsPendingCount`: **PASS**
- `testProcessRestart_preservesPendingCountFromRoomSourceOfTruth`: **PASS**

Gradle build execution: `BUILD SUCCESSFUL in 32s`.
