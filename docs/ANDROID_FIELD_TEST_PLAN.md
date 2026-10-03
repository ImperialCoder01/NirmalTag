# NIRMALTAG — ANDROID FIELD MANUAL TEST PLAN

## 1. Overview & Scope
This test plan provides step-by-step procedures for manual field validation on physical Android hardware or emulators once physical device testing environment is available.

---

## 2. Test Scenarios Matrix

| Test ID | Scenario | Procedure | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | **Online Pickup Scan** | 1. Open Collector App.<br>2. Scan active tag with live network.<br>3. Capture photo. | Photo saved to Room $\to$ WorkManager syncs $\to$ State becomes `SERVER_VERIFIED` $\to$ ₹2.00 handling incentive added. |
| **TC-02** | **Offline Pickup Capture** | 1. Enable Airplane Mode.<br>2. Scan active tag & capture photo.<br>3. Inspect Queue. | State shows `WAITING_FOR_NETWORK` (0 credits added locally). |
| **TC-03** | **Network Restoration Sync** | 1. Complete TC-02 (Airplane Mode).<br>2. Disable Airplane Mode (Restore network). | WorkManager automatically triggers $\to$ Pickup synced $\to$ State becomes `SERVER_VERIFIED`. |
| **TC-04** | **Force-Stop & Process Death** | 1. Capture offline pickup.<br>2. Force-stop application via Android Settings.<br>3. Re-open application. | Pending pickup remains in Room queue with same `localPickupId` & `idempotencyKey`. |
| **TC-05** | **Device Reboot Survival** | 1. Capture offline pickup.<br>2. Reboot physical device.<br>3. Unlock device & check app. | Pending pickup job remains in WorkManager queue and resumes upon network connection. |
| **TC-06** | **Expired Auth Refresh** | 1. Capture pickup with expired Firebase ID token.<br>2. Trigger sync. | Worker automatically refreshes Firebase ID token before calling Supabase RPC. |
| **TC-07** | **Closed Tag Server Rejection** | 1. Scan already closed tag.<br>2. Attempt sync. | Server rejects request $\to$ State becomes `SERVER_REJECTED` $\to$ No credits awarded. |
| **TC-08** | **Corrupted Evidence Detection** | 1. Capture pickup photo.<br>2. Modify image file bytes via file manager.<br>3. Trigger sync. | SHA-256 hash mismatch detected $\to$ Pickup marked `SERVER_REJECTED` $\to$ File not uploaded. |
| **TC-09** | **Duplicate Worker Execution** | 1. Trigger two simultaneous WorkManager sync jobs for same pickup. | Server idempotency key prevents duplicate crediting $\to$ Both workers reconcile to `SERVER_VERIFIED`. |
| **TC-10** | **Camera Permission Denied** | 1. Revoke camera permission in app settings.<br>2. Tap Open Camera. | App presents clear error message requiring permission $\to$ No phantom pickup queued. |

---

## 3. Execution Status

- **Android Unit Tests**: Executed (24/24 Passed).
- **Debug APK Build**: Executed (`android/app/build/outputs/apk/debug/NirmalTag.apk`, 30.5 MB).
- **Physical Device Field Testing**: Pending hardware availability.
