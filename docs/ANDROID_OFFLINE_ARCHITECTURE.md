# ANDROID OFFLINE-FIRST ARCHITECTURE SPECIFICATION

**Package:** `com.nirmaltag.app`  
**Core Components:** Room Database, WorkManager, CameraX, VisualVerificationEngine, Supabase Auth Integration  

---

## 1. Architectural Philosophy

The NirmalTag Android application is built as a durable, offline-first evidence capture client. 

- **Local Storage (Room):** Local queue, tag cache, photo evidence references, and offline state machine.
- **Durable Sync (WorkManager):** Background execution engine handling network constraints, exponential backoff, and process recovery.
- **Server Authority (PostgreSQL / Supabase):** All authorization, RLS, tag state machine invariants, credit ledgers, and reward policies remain 100% server-authoritative.

---

## 2. Room Database Schema Design

Located in package `com.nirmaltag.app.data.local`:

1. `PendingPickupEntity` (`pending_pickups` table)
   - `localId` (String, Primary Key - UUID)
   - `idempotencyKey` (String - Unique)
   - `pickupId` (String - UUID)
   - `tagId` (String - UUID)
   - `serialCode` (String)
   - `collectorUid` (String)
   - `photoUri` (String)
   - `capturedAt` (Long)
   - `updatedAt` (Long)
   - `state` (OfflinePickupState Enum)
   - `aiStatus` (String)
   - `aiConfidence` (Float)
   - `syncAttemptCount` (Int)
   - `lastSyncError` (String)

2. `TagCacheEntity` (`tag_cache` table)
   - `tagId` (String, Primary Key)
   - `serialCode` (String)
   - `status` (String)
   - `householdId` (String)
   - `cachedAt` (Long)

3. `SyncQueueEntity` (`sync_queue` table)
   - `queueId` (String, Primary Key)
   - `idempotencyKey` (String)
   - `payloadJson` (String)
   - `retryCount` (Int)
   - `status` (String)

4. `AuthSessionEntity` (`auth_session` table)
   - `uid` (String, Primary Key)
   - `email` (String)
   - `assignedRoles` (String - JSON array)
   - `lastLoginAt` (Long)

---

## 3. WorkManager Sync Execution Flow

1. Capture event occurs → `PickupRepository.enqueuePickup(...)` writes record to Room database in state `LOCAL_CAPTURED`.
2. `PickupSyncWorker` is enqueued with `NetworkType.CONNECTED` constraint and `BackoffPolicy.EXPONENTIAL`.
3. When network becomes available, `PickupSyncWorker.doWork()`:
   - Fetches un-synced pickups from `PickupDao`.
   - Obtains fresh Firebase ID Token via `FirebaseAuth.getInstance().currentUser?.getIdToken(false)`.
   - Executes POST request to `/api/v1/pickups/sync` (or Supabase Data API `/rest/v1/rpc/process_verified_pickup_transaction_v2`).
   - Parses server response. On success, updates Room state to `SERVER_VERIFIED`. On terminal rejection, updates state to `SERVER_REJECTED`. On transient failure, throws error triggering WorkManager backoff retry.
