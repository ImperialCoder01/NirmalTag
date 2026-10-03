# NIRMALTAG — ITERATION 9.17.1 PHYSICAL ANDROID DEVICE COLLECTOR E2E ACCEPTANCE REPORT

**Project:** NirmalTag Civic Tech  
**Target Device:** Physical Android Hardware (`<device-id>`)  
**Iteration:** 9.17.1  
**Timestamp:** 2026-10-04T04:29:30+05:30  
**Final Verdict:** **`PHYSICAL DEVICE COLLECTOR E2E BLOCKED`**

---

## 1. Executive Summary

Iteration 9.17.1 tested the NirmalTag Android application (`com.nirmaltag.app`) on a **physical Android test device** attached via ADB (`<device-id>`).

### Key Achievements:
- **Physical Device ADB Detection & Inspection (`PASS`):** Android version 10 (API 29, `arm64-v8a`), active internet network connectivity, and full hardware camera capability (`android.hardware.camera`, `android.hardware.camera.autofocus`, `android.hardware.camera.flash`) verified.
- **Build & Fresh Installation (`PASS`):** Compiled current debug APK (`NirmalTag.apk`) via `gradlew.bat assembleDebug` and installed cleanly on the physical device with runtime permissions (`adb install -r -g`).
- **Real Firebase Authentication & Scope (`PASS`):** `nirmaltag.e2e.collector@gmail.com` authenticated into `Field Waste Collector` scope and loaded Collector Dashboard UI.
- **CameraX Hardware Stream (`PASS`):** Opened Camera QR & AI Vision Scanner. `logcat` verified continuous real 30 FPS camera frames from MediaTek hardware ISP (`mtkcam-dev3`, `CameraDevice:187001`). `CAMERAX_REAL_STREAM = PASS`.
- **Log Security & Secret Protection (`PASS`):** Logcat logs audited; zero passwords, ID tokens, PATs, or database credentials exposed. Real Firebase UID masked as `X6k87mpP...`.

### Blockers / Not Executed Items:
- **Optical QR Camera Scan (`BLOCKED BY ENVIRONMENT`):** Presenting a physical printed paper QR code in front of the physical phone camera lens requires physical human operator presence. No mock serial injection, mock callback, or string validation shortcut was performed.
- **Android UI End-to-End Pickup & Offline Reconciliation (`NOT EXECUTED`):** Depends on optical QR camera scan completion.

---

## 2. Detailed Verification Matrix

| Section | Test Description | Status | Evidence / Notes |
|---|---|---|---|
| **1** | **Device Verification** | **PASS** | Physical Android 10 (API 29, `arm64-v8a`) device `<device-id>` verified. Internet connectivity active (ping 8.8.8.8, ~71.7 ms). |
| **2** | **Build and Install** | **PASS** | `gradlew.bat assembleDebug` succeeded. Installed `NirmalTag.apk` on physical device via `adb install -r -g` (`Success`). |
| **3** | **Real Firebase Login** | **PASS** | Authenticated `nirmaltag.e2e.collector@gmail.com`, loaded `UserRoleType.COLLECTOR`, displayed `Field Waste Collector` Dashboard UI. |
| **4** | **Real Camera Permission & Stream** | **PASS** | Camera permission granted. CameraX initialized; `logcat` confirmed `mtkcam-dev3` streaming hardware frames at 30 FPS. `CAMERAX_REAL_STREAM = PASS`. |
| **5** | **Real QR Test (Optical Scan)** | **BLOCKED BY ENVIRONMENT** | Physical paper QR code not presented to physical phone camera lens. Zero mock serials or string validation fallbacks injected. |
| **6** | **Invalid QR Test** | **NOT EXECUTED** | Depends on optical QR scan. |
| **7** | **Evidence Photo Capture** | **NOT EXECUTED** | Depends on optical QR scan trigger. |
| **8** | **AI Vision Classifier** | **PASS** | Model file missing by design; `VisualVerificationEngine.kt` honestly reports `MODEL_UNAVAILABLE` with `0.0%` fake confidence. |
| **9** | **Online Pickup (Android UI)** | **NOT EXECUTED** | Depends on optical QR camera scan. (Backend REST/RPC path was verified `PASS` in Iteration 9.17). |
| **10** | **Duplicate Submission** | **PASS (BACKEND)** | Verified `ALREADY_PROCESSED` on backend in Iteration 9.17. Android UI path `NOT EXECUTED`. |
| **11** | **Offline Test (Room State)** | **NOT EXECUTED** | Requires optical QR scan with network disabled. |
| **12** | **Process Death Recovery** | **NOT EXECUTED** | Requires pending local Room entity. |
| **13** | **WorkManager Reconciliation** | **NOT EXECUTED** | Requires pending local Room entity. |
| **14** | **Server Reconciliation** | **NOT EXECUTED** | Requires physical device pickup submission. |
| **15** | **Auth Failure Security** | **PASS (BACKEND)** | Unauthenticated and invalid token requests rejected (`HTTP 401 Access Denied`). |
| **16** | **Security & RBAC Enforcement** | **PASS (BACKEND)** | Role-Based Access Control and RLS policies verified on live database. |
| **17** | **Log Security** | **PASS** | Logcat clean (0 credentials or private tokens exposed; Firebase UID masked as `X6k87mpP...`). |
| **18** | **Final Verdict** | **`PHYSICAL DEVICE COLLECTOR E2E BLOCKED`** | Hardware camera stream functional; physical paper QR scan requires human physical presentation. |

---

## 3. Physical Device Hardware Environment

```text
Device Serial: <device-id> (Masked for Security)
Android Version: 10
API Level: 29
CPU ABI: arm64-v8a
Hardware Camera Features: android.hardware.camera, android.hardware.camera.any, android.hardware.camera.autofocus, android.hardware.camera.flash, android.hardware.camera.front, android.hardware.camera.level.full
Network Connectivity: ACTIVE (Ping 8.8.8.8 - 0% loss, 71.7ms)
Application Package: com.nirmaltag.app
Camera Stream Logcat Signature: 10-04 04:26:09.960 932 10332 D ULog: R AppRequest:399 M[CameraDevice:187001] + :mtkcam-dev3
CAMERAX_REAL_STREAM = PASS
```

---

## 4. Log Security & Secret Audit

- **Firebase Passwords & ID Tokens:** 0 instances found in logs or reports.
- **Supabase PAT & Secret Keys:** 0 instances found.
- **Database Connection Strings & Passwords:** 0 instances found.
- **Firebase UID Masking:** Masked as `X6k87mpP...` in documentation.
- **Device Serial Masking:** Masked as `<device-id>` in documentation.

---

## 5. Final Verdict

**`PHYSICAL DEVICE COLLECTOR E2E BLOCKED`**
