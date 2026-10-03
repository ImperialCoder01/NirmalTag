# NIRMALTAG — ANDROID OFFLINE SYNC CONTRACT

## 1. Overview
The Android client operates as a **strictly client-side evidence capture node**. 
It stores scanned tags, evidence photos (with SHA-256 hashes), and GPS coordinates in a local **Room Database** (`nirmaltag_offline.db`).

The client does **NOT** grant local credits, increment user balances locally, or alter tag states authoritative in PostgreSQL. All state transitions (`ATTACHED` -> `CLOSED`) and financial credit awards (`+₹2.00` to collector wallet, eco-points to household) are performed server-side inside Supabase RPC `process_verified_pickup_transaction_v2`.

---

## 2. Local State Lifecycle (`OfflinePickupState`)

| State | Trigger | Next State | Authority |
|---|---|---|---|
| `LOCAL_CAPTURED` | Collector scans QR & captures image | `LOCAL_AI_PENDING` / `WAITING_FOR_NETWORK` | Client (Room DB) |
| `LOCAL_AI_COMPLETED` | VisualVerificationEngine evaluation done | `WAITING_FOR_NETWORK` | Client (TFLite) |
| `WAITING_FOR_NETWORK` | Enqueued in `SyncQueueDao` | `UPLOADING` | Client (WorkManager) |
| `UPLOADING` | WorkManager detects `NetworkType.CONNECTED` | `SERVER_VERIFIED` / `SERVER_REJECTED` / `SYNC_FAILED` | Client network worker |
| `SERVER_VERIFIED` | Backend RPC returns HTTP 200 / `success: true` | Terminal State (Verified) | Server (PostgreSQL RPC) |
| `SERVER_REJECTED` | Backend RPC returns 4xx/5xx error (e.g. tag reused) | Terminal State (Rejected) | Server (PostgreSQL RLS / RPC) |
| `SYNC_FAILED` | Network timeout / 5xx error | `WAITING_FOR_NETWORK` (Retry) | Client Backoff Policy |

---

## 3. WorkManager Synchronization Rules

- **Execution Engine**: `PickupSyncWorker` extending `CoroutineWorker`
- **Network Constraints**: `NetworkType.CONNECTED`
- **Backoff Policy**: `BackoffPolicy.EXPONENTIAL` with `10_000ms` initial backoff
- **Idempotency**: Every pickup payload includes a unique `idempotencyKey` (UUIDv4) generated at capture time. Server RPC ensures duplicate transmissions with the same `idempotencyKey` return identical transaction responses without double-crediting.
- **Authentication**: Payloads include Firebase Auth ID Token in `Authorization: Bearer <idToken>` header.

---

## 4. Evidence Payload Schema

```json
{
  "idempotency_key": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "tag_serial_code": "NT-SAN-2026-8012",
  "collector_id": "usr_collector_8912",
  "photo_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "gps_latitude": 28.5355,
  "gps_longitude": 77.2610,
  "gps_accuracy_meters": 4.5,
  "captured_at_epoch_ms": 1791045819000,
  "local_ai_status": "MODEL_UNAVAILABLE",
  "local_ai_confidence": 0.0
}
```

---

## 5. Security & DPDP Rules
1. **Zero Secret Keys**: No Supabase `service_role` key or Firebase Admin keys stored in client APK.
2. **Evidence Retention**: Local evidence images stored in app-private directory (`context.filesDir/pickups/`) and deleted upon `SERVER_VERIFIED` acknowledgement.
3. **Data Fiduciary**: Meets DPDP Act 2023 minimal retention rules.
