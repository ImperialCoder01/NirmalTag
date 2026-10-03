# NIRMALTAG — ITERATION 4 FORENSIC AUDIT REPORT
## COLLECTOR WORKFLOW & SIMULATION IDENTIFICATION AUDIT

**Date**: October 4, 2026  
**Status**: AUDITED & IDENTIFIED  
**Repository**: `https://github.com/ImperialCoder01/NirmalTag.git`  
**Target Project**: `ubphrqumpqdifupwbvpe`  

---

## 1. WORKFLOW TRACE & MOCK IDENTIFICATION

A forensic line-by-line audit of `MainActivity.kt`, `PickupSyncWorker.kt`, `VisualVerificationEngine.kt`, and `data/local/` was conducted to trace the Collector pickup flow from login to UI feedback.

```
[1. User Auth] -> [2. Role Dashboard] -> [3. CameraX Scan] -> [4. Evidence Capture] -> [5. Room DB] -> [6. WorkManager] -> [7. Backend RPC] -> [8. State Update]
```

### Forensic Findings Matrix:

| Workflow Stage | Current Implementation | Remaining Mock / Simulation Identified | Required Remediation |
|---|---|---|---|
| **1. Authentication** | Firebase Auth SDK + Supabase Third-Party Auth header architecture. | None. 0 administrative keys in Android source. | Maintain clean Third-Party Auth architecture. |
| **2. Role Dashboard** | Compose UI role dashboard. Observes `getPendingCountFlow()`. | Static `walletBalance` local state initialized to 48.0. | Replace local balance mutation with server-synchronized balance stream. |
| **3. QR Scanning** | CameraX Preview reticle overlay. | Hardcoded random tag generator `val sampleTag = "NT-SAN-2026-${(8000..8999).random()}"`. | Implement formal format validation (`NT-[TYPE]-[YEAR]-[SERIAL]`) & server/cache format check. |
| **4. Tag Lookup** | Non-existent local tag validation before capture. | Assumed all generated tags were valid. | Query `TagCacheDao` or backend API to check tag state before evidence queueing. |
| **5. Evidence Capture** | Writes image placeholder to `context.filesDir/pickups/photo_...jpg`, computes SHA-256 hash. | Placeholder 1KB byte array written when hardware camera capture uninstantiated. | Ensure image file existence and valid byte length before Room insertion. |
| **6. Room DB Queue** | Inserts `PendingPickupEntity` with `idempotencyKey` UUID. | None. Schema handles persistent queue cleanly. | Maintain Room persistence. |
| **7. WorkManager Sync** | `PickupSyncWorker` enqueues under `NetworkType.CONNECTED`. | Simulated RPC delay in `simulateOrExecuteSync`. | Wire sync worker payload directly to backend RPC contract. |
| **8. AI Engine State** | `VisualVerificationEngine` checks `assets/`. | Returns `MODEL_UNAVAILABLE` with `0.0f` confidence. | **Keep `MODEL_UNAVAILABLE` as truthful state**. |
| **9. UI Balance & Status** | Client-side balance calculation. | **CRITICAL MOCK**: `walletBalance += 2.0` and `"Tag Status set to CLOSED"` applied locally in UI before server confirmation. | **REMOVE local balance increment**. Update UI only after server RPC confirmation. |

---

## 2. DETAILED CODE LOCATIONS OF REMAINING SIMULATIONS

1. **`MainActivity.kt` Line 864**:
   ```kotlin
   val sampleTag = "NT-SAN-2026-${(8000..8999).random()}"
   ```
   *Issue*: Generates unvalidated random tag strings during frame capture.
   *Remediation*: Implement formal tag serial validation (`validateTagSerialFormat(tag)`).

2. **`MainActivity.kt` Line 1332**:
   ```kotlin
   walletBalance += 2.0
   actionMessage = "Scanned Tag $tagCode • $aiResult • Tag Status set to CLOSED (+₹2.00)"
   ```
   *Issue*: Mutates local collector wallet balance (`+₹2.00`) and falsely claims `CLOSED` state locally before backend PostgreSQL RPC `process_verified_pickup_transaction_v2` executes.
   *Remediation*: Remove local `walletBalance += 2.0`. Set local UI state to `SAVED LOCALLY (WAITING FOR NETWORK)` or `SYNCING...`.

3. **`MainActivity.kt` Line 1335**:
   ```kotlin
   walletBalance += 10
   ```
   *Issue*: Mutates household wallet balance locally (`+10 Eco-Points`).
   *Remediation*: Remove local `walletBalance += 10`. Update balance only via backend response payload.

---

## 3. SUMMARY OF REMEDIATION PLAN FOR ITERATION 4

1. Remove all local client-side wallet additions (`walletBalance += 2.0`, `walletBalance += 10`).
2. Remove local claims of `"Tag Status set to CLOSED"`.
3. Enforce tag format validation (`NT-[TYPE]-[YEAR]-[SERIAL]`).
4. Ensure evidence capture validates image file existence and SHA-256 before inserting to Room DB.
5. Display real UI state transitions: `SCAN TAG` $\rightarrow$ `CAPTURE EVIDENCE` $\rightarrow$ `SAVED LOCALLY` $\rightarrow$ `WAITING FOR NETWORK` $\rightarrow$ `SYNCING` $\rightarrow$ `SERVER VERIFIED` / `SERVER REJECTED`.
