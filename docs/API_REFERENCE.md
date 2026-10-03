# NIRMALTAG — PRODUCTION API REFERENCE (v1)

## 1. Authentication & Session Resolution Endpoint

### `POST /api/v1/auth/session`
Resolves the authoritative PostgreSQL user profile, assigned roles, and scope boundaries for an authenticated Firebase identity.

- **Headers**: `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body**:
  ```json
  {
    "requestedRole": "HOUSEHOLD"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "authenticated": true,
    "user": {
      "uid": "fb_uid_123456",
      "email": "resident@nirmaltag.org",
      "full_name": "Resident Name"
    },
    "assignedRoles": ["HOUSEHOLD"],
    "activeRole": "HOUSEHOLD",
    "scope": {
      "level": "WARD",
      "wardId": "ward-42",
      "rwaId": "rwa-greenpark"
    },
    "isAuthorized": true
  }
  ```

---

## 2. Pickup Sync & Double-Entry Reward Endpoint

### `POST /api/v1/pickups/sync`
Processes verified waste pickups atomically: updates tag state to `CLOSED`, records AI classification, updates pickup status to `VERIFIED`, and posts credits to household/collector ledgers.

- **Headers**: `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body**:
  ```json
  {
    "pickupId": "123e4567-e89b-12d3-a456-426614174000",
    "tagId": "876e5432-e89b-12d3-a456-426614174000",
    "tagSerial": "NT-SAN-2026-8004",
    "idempotencyKey": "SYNC-PICKUP-20261003-9041",
    "aiResult": {
      "status": "VERIFIED",
      "confidence": 0.984,
      "category": "Sanitary Waste Pouch"
    }
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "pickupStatus": "VERIFIED",
    "tagStatus": "CLOSED",
    "householdBalance": 150.0,
    "collectorBalance": 50.0,
    "idempotencyKey": "SYNC-PICKUP-20261003-9041"
  }
  ```

---

## 3. Tag Serialization & Batch Endpoint

### `POST /api/v1/tag-batches`
Generates authorized serial tag batches (`NT-SAN-2026-XXXX`) for municipal ward distribution.

- **Headers**: `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body**:
  ```json
  {
    "batchName": "BATCH-2026-004",
    "quantity": 1000,
    "wardId": "ward-42",
    "idempotencyKey": "GEN-BATCH-20261003-004"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "batchId": "batch-uuid-901",
    "batchName": "BATCH-2026-004",
    "quantity": 1000,
    "startSerial": "NT-SAN-2026-8001",
    "endSerial": "NT-SAN-2026-9000"
  }
  ```

---

## 4. Tag Lifecycle Transition Endpoint

### `POST /api/v1/tags/lifecycle`
Executes server-side tag state transitions with single-use invariant checks.

- **Headers**: `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body**:
  ```json
  {
    "tagId": "876e5432-e89b-12d3-a456-426614174000",
    "newStatus": "CLOSED",
    "reason": "Collector pickup complete",
    "idempotencyKey": "TAG-TRANS-20261003-001"
  }
  ```
