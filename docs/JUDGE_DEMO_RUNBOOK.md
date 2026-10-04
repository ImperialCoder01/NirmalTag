# NIRMALTAG — JUDGE DEMO RUNBOOK

> [!IMPORTANT]
> **Pre-Flight Notice**: This runbook provides a step-by-step operational guide for judges, evaluators, and pilot organizers demonstrating the NirmalTag sanitary waste management ecosystem across Web and Android applications. Zero hardcoded secrets are included in this runbook.

---

## 1. Environment & Health Pre-Flight Check

Before starting a demo, verify system availability via the safe Health Check API:

- **Web Application URL**: `http://localhost:3000` (or production Vercel deployment URL)
- **Health Endpoint**: `GET /api/v1/health`
- **Expected Health Response**:
  ```json
  {
    "name": "NirmalTag Operational Health Check",
    "version": "1.0.0",
    "overallStatus": "PASS",
    "checks": {
      "web_application": { "status": "PASS" },
      "database_connectivity": { "status": "PASS" },
      "authentication_subsystem": { "status": "PASS" },
      "household_pouch_api": { "status": "PASS" },
      "collector_job_api": { "status": "PASS" },
      "pickup_transaction_api": { "status": "PASS" },
      "ai_visual_classifier": { "status": "WARNING", "detail": "MODEL_UNAVAILABLE — TFLite engine ready; domain dataset training pending." }
    }
  }
  ```

---

## 2. Recommended Demonstration User Accounts

Use the pre-configured role test identities or sign in with Google/Firebase Authentication:

| Role | Access URL | Account Identifier | Scope |
| :--- | :--- | :--- | :--- |
| **Household Resident** | `/household` | `resident@nirmaltag.org` | Ward 42 Household Resident |
| **Field Collector** | `/collector` (or Android APK) | `collector@nirmaltag.org` | Field Worker / Ward 42 |
| **Tag Officer** | `/tag-officer` | `officer@nirmaltag.org` | Inventory & Tag Assignment |
| **RWA Admin** | `/rwa` | `rwa@nirmaltag.org` | Society Governance |
| **MCD Executive** | `/mcd` | `mcd@nirmaltag.org` | Municipal Zone Analytics |
| **System Admin** | `/admin` | `admin@nirmaltag.org` | RBAC & Audit Logs |

---

## 3. The Unified 6-Step Demonstration Journey

### Step 1: Resident Pouch Order Request
1. Open Household Portal at `/household`.
2. Click **"Request Special Care Pouch"**.
3. Select pouch type: `Sanitary & Special Care`. Quantity: `1`.
4. Submit request. Observe state: **`PENDING`**.

### Step 2: Tag Officer / Collector Fulfillment
1. Open Tag Officer / Collector view at `/tag-officer` or `/collector`.
2. Locate pending pouch request for Ward 42.
3. Scan or enter physical QR tag code (e.g. `NT-SAN-2026-9901`).
4. Click **"Fulfill & Bind Tag"**.
5. Observe: Pouch status transitions to **`DELIVERED`**; Tag state transitions from `IN_INVENTORY` to **`ASSIGNED`**.

### Step 3: Resident Tag Activation
1. Return to Household Portal `/household`.
2. Observe resident in-app delivery notification: *"Your sanitary pouch and QR tag (NT-SAN-2026-9901) have been delivered!"*
3. Locate tag in **Assigned Tags** list and click **"Activate Tag"**.
4. Observe: Tag state transitions from `ASSIGNED` to **`ACTIVE`**.

### Step 4: Resident Pickup Booking
1. Click **"Book Pickup Appointment"** for active tag `NT-SAN-2026-9901`.
2. Select target date (e.g., tomorrow) and time window (`08:00 AM - 10:00 AM`).
3. Submit booking. Observe: `pickup_requests` status: **`SCHEDULED`**.

### Step 5: Collector Field Job Execution (Web or Android APK)
1. Launch NirmalTag Android APK (or open `/collector` Web Portal).
2. View **Today's Jobs**. Observe scheduled pickup for tag `NT-SAN-2026-9901`.
3. Open **QR Scanner**. Point camera at physical QR tag `NT-SAN-2026-9901`.
4. Capture evidence image via CameraX JPEG pipeline. App verifies valid JPEG header (`FF D8 FF`) and computes SHA-256 hash automatically.
5. Note AI Status display: **`Status: Model Unavailable`** (Transparent fallback: physical QR scan and pickup processing continue cleanly without fake confidence scores).
6. Tap **"Verify & Sync Pickup"**.

### Step 6: Server Finalization & Double-Entry Rewards
1. Android Room DB enqueues transaction; WorkManager posts to `POST /api/v1/pickups/sync`.
2. PostgreSQL RPC `process_verified_pickup_transaction_v2` executes.
3. Observe:
   - Tag state updates to **`CLOSED`**.
   - Household credit balance updates: **`+10.0 credits`**.
   - Collector incentive balance updates: **`+₹2.00 incentive`**.
   - Resident receives completion notification.
   - MCD / RWA dashboards update aggregate volume metrics.

---

## 4. Idempotency & Failure Recovery Verification

- **Offline / Network Interruption**: Disable network on Android device during pickup scan. Observe badge: **`WAITING FOR NETWORK`**. Re-enable network; tap sync. Observe transition: **`VERIFIED`**.
- **Duplicate Sync Replay Protection**: Tap "Sync" a second time on the same pickup ID. Observe response: **`ALREADY_PROCESSED`**. Verify credit balance delta = `0.0` (Double-crediting prevented).
- **Unauthorized Access Attempt**: Try activating tag assigned to another household. Observe error: `ACCESS_DENIED`.

---

## 5. Safe Demo Reset Mechanism

If resetting synthetic demonstration data prior to a new presentation:
1. Log in as System Admin (`/admin`).
2. Trigger `POST /api/v1/admin/demo-reset`.
3. System safely resets synthetic demo states without deleting real pilot accounts or production records.

---

## 6. Backup Demonstration Path

If physical camera access is unavailable during a remote presentation:
- Use the built-in Web Collector Portal at `/collector`.
- The Web portal supports manual QR input or simulated camera scanning with full API parity.
