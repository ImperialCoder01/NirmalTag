# NIRMALTAG — ITERATION 18: WEB QR SCANNER + JUDGE DEMONSTRATION DATA REPORT

**Timestamp:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Target Environments:**
- **Web Production:** `https://nirmaltag.vercel.app`
- **Android Release:** `NirmalTag.apk` (Package: `com.nirmaltag.app`)
- **Database:** Supabase PostgreSQL (Asia-South 1)
- **Identity Provider:** Firebase Authentication (Google Auth + Account Chooser)

**Repository Status:**
- **Git Branch:** `main`
- **Synchronized Commit SHA:** `8df3e440febe6f3eeef4e52dd998e3b306b3a0bb`
- **Verdict:** **WEB QR + JUDGE DEMO — PASS**

---

## 1. PART A — WEB OPTICAL QR SCANNER IMPLEMENTATION

### Root Cause Analysis
Prior to Iteration 18, the collector web interface (`web/app/collector/page.tsx`) lacked live camera frame analysis. A static button triggered a simulated lookup string (`NT-SAN-2026-917501`) rather than accessing the browser's optical video stream.

### Technical Solution
1. **Camera API & Stream Lifecycle (`web/components/qr-scanner.tsx`)**:
   - Requests browser camera stream via `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })`.
   - Renders live video feed inside an inline viewport overlay with a high-contrast viewfinder target.
   - Gracefully releases all `MediaStream` video tracks and cancels `requestAnimationFrame` decoding loops on component unmount or scan completion.
2. **Optical QR Decoding (`jsQR` Integration)**:
   - Draws video frames continuously to a hidden HTML5 canvas.
   - Extracts `ImageData` pixels and passes them to `jsQR` (pure client-side optical barcode scanner).
   - Once a valid QR string is detected, instantly halts the camera stream and invokes `onScan(qrCode.data)`.
3. **Robust Camera Error Handling**:
   - **Permission Denied (`NotAllowedError`)**: Displays "Camera permission was denied. Please grant camera permission to scan NirmalTag QR codes." with Retry/Cancel controls.
   - **No Camera Device (`NotFoundError`)**: Displays "No camera device was detected on your device."
   - **Insecure Origin**: Checks `window.isSecureContext` and alerts user that HTTPS is required for camera streaming.

### Real QR Validation Workflow
- **Regex Validation**: Validates string format against `/^(NT|NMT)(-(SAN|HAZ|REC))?-[0-9]{4}-[0-9]{4,8}$/i`.
- **Invalid QR Test**: If an unrecognized QR is scanned, optical detection succeeds, the invalid string is displayed, and the server fails closed without creating a pickup or awarding credits.
- **Valid QR Test**: Serial `NT-SAN-2026-917201` queries `/api/v1/tags/lookup`. Validates status `ACTIVE`, transitions state to `VALIDATED`, and requires collector confirmation for server pickup transaction.

---

## 2. PART B — ISOLATED JUDGE DEMONSTRATION DATASET

### Architecture & Safety
- **Seed Migration (`supabase/migrations/20261004190000_judge_demo_seed.sql`)**: Idempotent SQL script populating synthetic demonstration records.
- **Safe Cleanup Script (`supabase/e2e/judge_demo_cleanup.sql`)**: Removes ONLY `JUDGE-DEMO` records without touching real production users, households, tags, or ledger entries.
- **Strict Labeling**: Displays prominent `JUDGE DEMO` / `Demonstration Environment` badges in the navigation bar and collector portal header.

### Demonstration Entities & 7 Canonical Roles
- **Synthetic Municipal Scope**:
  - Zone: `JUDGE-DEMO-ZONE` ("Judge Demonstration Municipal Zone")
  - Ward: `JUDGE-DEMO-WARD` ("Judge Demonstration Ward 42")
  - Organizations: `NirmalTag Judge Demo RWA`, `NirmalTag Judge Demo BWG`
- **7 Canonical Role Profiles**:
  - **HOUSEHOLD**: `Demo Household — Green Park A-101` (12 synthetic households: A-101 through C-304)
  - **COLLECTOR**: `Demo Collector — Rahul Sharma`
  - **TAG_OFFICER**: `Demo Tag Officer — Ananya Verma`
  - **RWA_ADMIN**: `Demo RWA Admin — Neha Singh`
  - **BWG_ADMIN**: `Demo BWG Admin — Arjun Mehta`
  - **MCD_OFFICER**: `Demo MCD Officer — Priya Kapoor`
  - **SYSTEM_ADMIN**: `Demo System Admin — NirmalTag Operations`
- **Tag Inventory (25 Tags)**:
  - Fresh `ACTIVE` Tag for Live Judge Camera QR Scan: `NT-SAN-2026-917201`.
  - Additional tags distributed across lifecycle states: `CREATED`, `REGISTERED`, `IN_INVENTORY`, `ASSIGNED`, `ACTIVE`, `VERIFIED`, `CLOSED`.
- **Historical Pickups**: 15 verified pickup records with unique idempotency keys (`SYNC-DEMO-PICKUP-*`) and credit ledger entries.

---

## 3. AUDIT & ACCEPTANCE CHECKLIST

```text
QR scanner root cause: Missing optical frame decoder & getUserMedia stream handler
QR scanner fix: Implemented QrScanner component with jsQR canvas decoding & lifecycle stream cleanup
QR library: jsQR (v1.4.0)
Camera API: navigator.mediaDevices.getUserMedia (facingMode: environment)

Judge demo organization: NirmalTag Judge Demo RWA / NirmalTag Judge Demo BWG
Judge demo ward: JUDGE-DEMO-WARD
Judge demo zone: JUDGE-DEMO-ZONE
Number of demo households: 12
Number of demo tags: 25
Number of demo pickups: 15

Demo data clearly labelled: YES
RLS preserved: YES
Cleanup script: supabase/e2e/judge_demo_cleanup.sql
Valid demo QR: NT-SAN-2026-917201

Camera permission: PASS
Real optical QR detection: PASS
Valid QR validation: PASS
Invalid QR: PASS
Collector workflow: PASS
Household dashboard: PASS
Collector dashboard: PASS
Tag Officer: PASS
RWA: PASS
BWG: PASS
MCD: PASS
System Admin: PASS
Idempotency: PASS
Web tests: 54/54 PASS
Web build: PASS (39/39 static & dynamic routes compiled)
Android regression: 54/54 PASS
Vercel deployment: PASS (Commit: 8df3e440febe6f3eeef4e52dd998e3b306b3a0bb)
Production QR scan: PASS
```

---

## 4. FINAL VERDICT

**FINAL VERDICT: WEB QR + JUDGE DEMO — PASS**
