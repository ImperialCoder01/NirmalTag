# NIRMALTAG — ITERATION 4.1 REPORT
## TAG CONTRACT & ANDROID/BACKEND STATE CONSISTENCY AUDIT

**Date**: October 4, 2026  
**Status**: AUDITED & CONSISTENT  
**Repository**: `https://github.com/ImperialCoder01/NirmalTag.git`  
**Target Project**: `ubphrqumpqdifupwbvpe`  

---

## 1. AUTHORITATIVE SERVER TAG STATES & MAPPING TABLE

Based on live PostgreSQL migration definitions (`20261003000001` to `20261003000005`), tag status is governed by PostgreSQL enum `tag_status_enum` and transition function `validate_tag_state_transition()`.

### Authoritative Server Tag Lifecycle:
`CREATED` $\to$ `REGISTERED` $\to$ `IN_INVENTORY` $\to$ `ASSIGNED` $\to$ `ACTIVE` $\to$ `SCANNED` $\to$ `PICKUP_PENDING` $\to$ `VERIFIED` $\to$ `CLOSED`

### State Mapping Table:

| Server PostgreSQL State (`tag_status_enum`) | Android Client Representation (`OfflinePickupState` / `TagCacheEntity`) | Valid Transition Trigger | Source of Authority |
|---|---|---|---|
| **`CREATED`** | `TagCacheEntity.lastKnownState = "CREATED"` | Batch serialization | Server (Tag Officer / System Admin) |
| **`REGISTERED`** | `TagCacheEntity.lastKnownState = "REGISTERED"` | Batch registration | Server (Tag Officer) |
| **`IN_INVENTORY`** | `TagCacheEntity.lastKnownState = "IN_INVENTORY"` | Distribution assignment | Server (Tag Officer / RWA) |
| **`ASSIGNED`** | `TagCacheEntity.lastKnownState = "ASSIGNED"` | Household allocation | Server (Tag Officer / RWA) |
| **`ACTIVE`** | `TagCacheEntity.lastKnownState = "ACTIVE"` | Household pouch attachment | Server (Household / System) |
| **`SCANNED`** | `OfflinePickupState.LOCAL_CAPTURED` | Collector scans QR code | Client evidence capture |
| **`PICKUP_PENDING`** | `OfflinePickupState.WAITING_FOR_NETWORK` / `UPLOADING` | WorkManager queueing | Client network worker |
| **`VERIFIED`** | `OfflinePickupState.SERVER_VERIFIED` | RPC `process_verified_pickup_transaction_v2` (200 OK) | **Server (PostgreSQL RPC)** |
| **`CLOSED`** | `TagCacheEntity.lastKnownState = "CLOSED"` | RPC `transition_tag_state(..., 'CLOSED')` | **Server (PostgreSQL RPC)** |
| **`REJECTED` / `INVALIDATED`** | `OfflinePickupState.SERVER_REJECTED` | RPC exception (e.g. tag already closed) | **Server (PostgreSQL RPC)** |

---

## 2. TRANSITION CONSISTENCY ANALYSIS

- **Server Authority Enforcement**: The Android client **NEVER** finalizes `VERIFIED` or `CLOSED` states locally.
- **Network Queueing**: When offline, pickups are queued as `WAITING_FOR_NETWORK`.
- **Rejection Handling**: When backend RPC returns error (e.g. `TAG_ALREADY_CLOSED`, `UNAUTHORIZED_ROLE`, `INVALID_TRANSITION`), `PickupSyncWorker` catches the failure and sets local state to `SERVER_REJECTED` with the server error message. Permanent failures do not retry indefinitely.

---

## 3. TAG FORMAT CONTRACT

- **Server Canonical Code**: Defined in schema as `canonical_code VARCHAR(100)` (e.g., `NT-SAN-2026-8012`, `NMT-2026-000001`).
- **Client UX Validation**: [`TagValidationUtil.kt`](file:///d:/LOQ/Documents/WasteChakra/android/app/src/main/java/com/nirmaltag/app/util/TagValidationUtil.kt) enforces regex `^(NT|NMT)(-(SAN|HAZ|REC))?-[0-9]{4}-[0-9]{4,8}$`.
- **Authority Rule**: Client regex is strictly for **UX input validation** (rejecting empty or malformed strings before network transmission). The PostgreSQL database remains 100% authoritative for tag validity.

---

## 4. TAG TYPE & HOUSEHOLD ASSIGNMENT AUTHORITY

- **Tag Type Authority**: Derived from `tags.waste_category_id` in PostgreSQL. Client UX parsing (`parseTagTypeUX`) provides UI icon preview only.
- **Household Assignment Authority**: Derived from `tags.current_assigned_household_id` in PostgreSQL RPC `process_verified_pickup_transaction_v2`. The client **cannot** supply or override household identity.

---

## 5. COLLECTOR AUTHORIZATION CONTRACT

- **Authentication Chain**:  
  Firebase Auth ID Token $\to$ Supabase `auth.uid()` $\to$ `profiles` $\to$ `user_roles` $\to$ `collectors`.
- **Zero Client Trust**: The backend RPC verifies effective collector identity from authenticated `auth.uid()` / JWT claims. Client-supplied `collector_id` fields are ignored for authorization.

---

## 6. OFFLINE CACHE SAFETY AUDIT (`TagCacheEntity`)

Cached fields in `TagCacheEntity` (`tagSerialCode`, `batchId`, `assignedHouseholdId`, `tagType`, `lastKnownState`) are classified as **NON-AUTHORITATIVE / UX-ONLY**:
- Cached data improves offline preview rendering.
- When network is restored, server response overrides cached values.

---

## 7. PICKUP PAYLOAD CLASSIFICATION MATRIX

```json
{
  "idempotency_key": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",  // CLIENT IDENTIFIER
  "tag_serial_code": "NT-SAN-2026-8012",                     // CLIENT IDENTIFIER
  "collector_id": "usr_collector_8912",                       // CLIENT IDENTIFIER (Context only)
  "photo_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e...",// CLIENT EVIDENCE
  "gps_latitude": 28.5355,                                  // CLIENT EVIDENCE
  "gps_longitude": 77.2610,                                 // CLIENT EVIDENCE
  "gps_accuracy_meters": 4.5,                               // CLIENT EVIDENCE
  "captured_at_epoch_ms": 1791045819000,                    // CLIENT EVIDENCE
  "local_ai_status": "MODEL_UNAVAILABLE",                    // CLIENT EVIDENCE METADATA
  "local_ai_confidence": 0.0                                 // CLIENT EVIDENCE METADATA
}
```

### Server-Derived Fields (Forbidden Client Authority):
- `household_credit_amount`: **SERVER-DERIVED** (from `reward_policies`)
- `collector_incentive_amount`: **SERVER-DERIVED** (from `reward_policies`)
- `final_tag_status`: **SERVER-DERIVED** (`CLOSED`)
- `final_verification`: **SERVER-DERIVED** (`VERIFIED`)
- `household_ownership`: **SERVER-DERIVED** (from `tags.current_assigned_household_id`)

---

## 8. UI STATE AUTHORITY

The Collector UI transitions through explicit status states:
`SCAN TAG` $\to$ `CAPTURE EVIDENCE` $\to$ `SAVED LOCALLY` $\to$ `WAITING FOR NETWORK` $\to$ `SYNCING` $\to$ `SERVER VERIFIED` / `SERVER REJECTED`.

The UI **never** displays `SERVER VERIFIED` prior to backend HTTP 200 / RPC acknowledgement.

---

## 9. UNIT TEST EXECUTION RECORD

- **Command**: `.\gradlew.bat test --console=plain`
- **Result**: `BUILD SUCCESSFUL in 19s`
- **Tests Executed & Passed**:
  - `TagContractConsistencyTest.kt`: `testTagFormatContract` PASSED
  - `TagContractConsistencyTest.kt`: `testServerRejectedTagHandling` PASSED
  - `TagContractConsistencyTest.kt`: `testClosedTagRejection` PASSED
  - `TagContractConsistencyTest.kt`: `testUnauthorizedCollectorRejection` PASSED
  - `TagContractConsistencyTest.kt`: `testHouseholdMismatchIsolation` PASSED
  - `TagContractConsistencyTest.kt`: `testDuplicatePickupIdempotency` PASSED
  - `TagContractConsistencyTest.kt`: `testOfflineCachedTagNonAuthoritative` PASSED
  - `CollectorWorkflowTest.kt`: `testTagSerialFormatValidation` PASSED
  - `CollectorWorkflowTest.kt`: `testCollectorIdentityIsolationFromHousehold` PASSED
  - `CollectorWorkflowTest.kt`: `testTruthfulAiStateModelUnavailable` PASSED
  - `VisualVerificationEngineTest.kt`: `testTruthfulModelUnavailableOutput` PASSED
  - `IdempotencyAndSyncContractTest.kt`: `testIdempotencyKeyPersistenceAcrossRetries` PASSED

---

## 10. CONCLUSION & DISCREPANCY ANALYSIS

Iteration 4.1 audit confirms 100% consistency between the Android client implementation and the live Supabase PostgreSQL tag contract. Client-side authority is zero; PostgreSQL RLS and RPC `process_verified_pickup_transaction_v2` remain completely authoritative.
