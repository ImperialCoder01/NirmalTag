# NIRMALTAG — ITERATION 9.17.2 REAL PHYSICAL QR SCAN REPORT

**Project:** NirmalTag Civic Tech  
**Target Device:** Physical Android Hardware (`<device-id>`)  
**Iteration:** 9.17.2  
**Timestamp:** 2026-10-04T04:33:30+05:30  
**Status:** **`AWAITING PHYSICAL QR OPERATOR PRESENTATION`**

---

## 1. Provisioned Fresh Isolated E2E Tag

- **Tag Serial:** `NT-SAN-2026-917201` (Masked: `NT-SAN-2026-917...`)
- **Status:** `ACTIVE`
- **Assigned Household:** `00000000-0000-4000-a000-000000000093` (`Flat E2E-101, E2E Test Colony`)
- **Assigned Collector:** `00000000-0000-4000-a000-000000000096` (`E2E Test Waste Collector`)
- **Closed Tag `NT-SAN-2026-101152` Reused?** NO (Untouched).

---

## 2. Local QR Code Generation & Display

- **QR Code Payload:** `NT-SAN-2026-917201`
- **Generator Method:** Pure offline high-contrast QR generator (Version 2-L, 320x320px). Zero online/external web API calls.
- **Local Display Artifact:** [scratch/qr_code_display.html](file:///d:/LOQ/Documents/WasteChakra/scratch/qr_code_display.html)
- **App Bypass / Mock Serial Injection:** ZERO. CameraX & MLKit detector remain 100% active and un-mocked.

---

## 3. Operator Physical Scan Procedure

1. **Local Screen:** The QR code for `NT-SAN-2026-917201` is actively open in your browser (`scratch/qr_code_display.html`).
2. **Physical Camera:** Point the physical Android phone's camera lens directly at the QR code on your computer screen.
3. **CameraX Optical Scanning:** CameraX and MLKit barcode scanner will automatically capture the optical image, decode `NT-SAN-2026-917201`, and populate the scanned code into the app.

---

## 4. Verification Matrix

| Step | Item | Status | Details |
|---|---|---|---|
| **1** | **Fresh Tag Provisioning** | **PASS** | `NT-SAN-2026-917201` (`ACTIVE`, Household `00000000-0000-4000-a000-000000000093`). |
| **2** | **Offline QR Generation** | **PASS** | 100% offline HTML/JS high-contrast QR rendering. |
| **3** | **Local QR Display** | **PASS** | Opened in local browser window. |
| **4** | **CameraX Hardware Stream** | **PASS** | `mtkcam-dev3` streaming live hardware frames at 30 FPS. |
| **5** | **Physical Optical Scan** | **AWAITING OPERATOR** | Hold physical phone in front of screen QR. |
| **6** | **Pickup Transaction Execution** | **NOT EXECUTED** | Paused as instructed (zero state transitions/credits awarded). |

---

## 5. Security & Invariant Audit

- **Side-Effect Audit:** 0 pickups executed, 0 credits awarded, 0 collector incentives granted.
- **Tag State Audit:** `NT-SAN-2026-917201` remains `ACTIVE`.
- **Log Security:** Zero credentials, tokens, or private secrets exposed.
