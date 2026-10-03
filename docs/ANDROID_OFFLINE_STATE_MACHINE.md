# ANDROID OFFLINE-FIRST PICKUP STATE MACHINE SPECIFICATION

**System:** NirmalTag Android Application  
**Component:** Local Operational Queue & State Synchronization  

---

## 1. Overview

The Android application operates strictly as an offline-first evidence capture and local queueing engine. Local state transitions are explicit, durable, and persistent across process restarts, app kills, and network outages.

Local Room persistence is an operational queue and cache. **PostgreSQL / Supabase remains the authoritative source of truth.**

---

## 2. Explicit Local Pickup States (`OfflinePickupState`)

| State | Category | Description |
|---|---|---|
| `LOCAL_CAPTURED` | Operational | QR tag code and evidence photo captured locally on device. |
| `LOCAL_AI_PENDING` | Operational | Photo evidence queued for local visual verification engine. |
| `LOCAL_AI_COMPLETED` | Operational | Visual evidence classification evaluated; evidence metadata attached. |
| `WAITING_FOR_NETWORK` | Sync Queue | Enqueued in WorkManager waiting for internet connectivity constraint. |
| `UPLOADING` | Sync Execution | WorkManager actively transmitting payload & photo evidence to server. |
| `SERVER_PENDING` | Server Processing | Request sent; awaiting server transaction response. |
| `SERVER_VERIFIED` | Terminal Success | Server validated tag, derived reward from PostgreSQL policy, closed tag, and credited accounts. |
| `SERVER_REJECTED` | Terminal Failure | Server rejected request (e.g. tag re-activation violation, invalid tag assignment). |
| `SYNC_FAILED` | Retry Queue | Network error or transient failure during transmission; scheduled for WorkManager backoff retry. |

---

## 3. Allowed Transition Graph

```
[CameraX Capture]
       │
       ▼
LOCAL_CAPTURED
       │
       ▼
LOCAL_AI_PENDING ──► LOCAL_AI_COMPLETED
                            │
                            ▼
                    WAITING_FOR_NETWORK
                            │
                            ▼
                        UPLOADING
                       /    |    \
                      /     |     \
                     ▼      ▼      ▼
        SERVER_VERIFIED  SERVER_REJECTED  SYNC_FAILED
                                             │ (Backoff Retry)
                                             ▼
                                     WAITING_FOR_NETWORK
```

---

## 4. Invariant Rules

1. **State Explicitly Enum-Driven:** Booleans like `isSynced` or `isVerified` MUST NOT be used as the primary state authority.
2. **Local ID & Idempotency Key Immutability:** Generated at initial `LOCAL_CAPTURED` event. Unchanged across process kills, retries, or app restarts.
3. **No Local Payout:** Local app NEVER displays credits awarded until server returns status `SERVER_VERIFIED`.
4. **Terminal Rejection:** When server returns `SERVER_REJECTED`, local record state becomes `SERVER_REJECTED` with zero retries.
