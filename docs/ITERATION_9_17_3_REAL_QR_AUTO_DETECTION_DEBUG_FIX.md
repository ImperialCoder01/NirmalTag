# NIRMALTAG — ITERATION 9.17.3 REAL QR AUTO-DETECTION DEBUG & FIX REPORT

**Project:** NirmalTag Civic Tech  
**Target Device:** Physical Android Hardware (`<device-id>`)  
**Iteration:** 9.17.3  
**Timestamp:** 2026-10-04T04:47:45+05:30  
**Status:** **`REAL PHYSICAL QR AUTO-DETECTION VERIFIED PASS`**

---

## 1. Root Cause Identification

Prior to Iteration 9.17.3, physical QR auto-detection failed due to two root causes:
1. **Missing ML Kit Barcode Scanning Dependency:** `com.google.mlkit:barcode-scanning` was omitted from `android/app/build.gradle.kts`.
2. **Missing `ImageAnalysis` Camera Binding:** In `MainActivity.kt`'s `CollectorScannerDialog`, `cameraProvider.bindToLifecycle(...)` only bound `preview`. `ImageAnalysis` was never created or attached to the camera lifecycle, so camera frames were never passed to an analyzer.
3. **Hardcoded Fallback Value in UI Field:** `manualTagInput` was initialized with hardcoded `"NT-SAN-2026-8012"`, masking whether an optical scan actually occurred.

---

## 2. Exact File(s) Changed

1. **[android/app/build.gradle.kts](file:///d:/LOQ/Documents/WasteChakra/android/app/build.gradle.kts)**
   - Added ML Kit Barcode Scanning dependency: `implementation("com.google.mlkit:barcode-scanning:17.2.0")`.
2. **[android/app/src/main/java/com/nirmaltag/app/MainActivity.kt](file:///d:/LOQ/Documents/WasteChakra/android/app/src/main/java/com/nirmaltag/app/MainActivity.kt)**
   - Added file-level `@file:OptIn(androidx.camera.core.ExperimentalGetImage::class)` and imports for `ImageAnalysis`, `ImageProxy`, `InputImage`, `BarcodeScanning`, `AtomicBoolean`, `Executors`.
   - Cleared pre-filled text field default (initialized to `""`).
   - Configured `ImageAnalysis` with `STRATEGY_KEEP_ONLY_LATEST`.
   - Wired `ImageProxy` frames to `InputImage.fromMediaImage(mediaImage, rotationDegrees)` and `BarcodeScanning.getClient().process(inputImage)`.
   - Added diagnostic logging tags (`QR_SCAN_FRAME_RECEIVED`, `QR_SCAN_BARCODE_COUNT`, `QR_SCAN_RAW_VALUE`, `QR_SCAN_SUCCESS`).
   - Bound `imageAnalysis` to `cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageAnalysis)`.
   - Added visual auto-detection badge `✓ QR Code Optically Scanned & Decoded via CameraX ML Kit`.

---

## 3. Exact Scanner Pipeline Before / After

### Before (Buggy Pipeline):
```text
CameraX Hardware Camera → Preview → PreviewView (UI Display Only)
[ImageAnalysis: OMITTED] → [ML Kit: OMITTED] → [Decoded Raw Value: NONE]
UI Field: Pre-filled hardcoded "NT-SAN-2026-8012"
```

### After (Verified Working Pipeline):
```text
CameraX Hardware Camera (mtkcam-dev3)
  ├──> Preview → PreviewView (UI Viewfinder)
  └──> ImageAnalysis (STRATEGY_KEEP_ONLY_LATEST)
         └──> ImageProxy
                └──> InputImage.fromMediaImage(mediaImage, rotationDegrees)
                       └──> ML Kit BarcodeScanner.process(inputImage)
                              └──> barcode.rawValue ("NT-SAN-2026-917201")
                                     └──> TagValidationUtil.isValidTagSerial()
                                            └──> UI State Update (scannedTagInput = "NT-SAN-2026-917201", isAutoDetected = true)
```

---

## 4. ML Kit Dependency & Version

- **Library:** `com.google.mlkit:barcode-scanning:17.2.0`
- **Native Binary Compiled:** `libbarhopper_v3.so` (integrated into `NirmalTag.apk`).

---

## 5. ImageAnalysis Frame Verification

Logcat evidence confirms continuous frame delivery from MediaTek ISP to CameraX `ImageAnalysis`:
```text
10-04 04:47:21.814 28009 30862 D CollectorScanner: QR_SCAN_FRAME_RECEIVED timestamp=221304894460000
10-04 04:47:21.863 28009 30862 D CollectorScanner: QR_SCAN_FRAME_RECEIVED timestamp=221304962017000
10-04 04:47:21.909 28009 30862 D CollectorScanner: QR_SCAN_FRAME_RECEIVED timestamp=221304995795000
```

---

## 6. Physical QR Detection & Decoded Value

ML Kit successfully detected and optically decoded the physical QR code presented to the phone camera lens:
```text
10-04 04:47:21.812 28009 28009 D CollectorScanner: QR_SCAN_BARCODE_COUNT=1
10-04 04:47:21.812 28009 28009 D CollectorScanner: QR_SCAN_RAW_VALUE=NT-SAN-2026-917201
10-04 04:47:21.812 28009 28009 D CollectorScanner: QR_SCAN_SUCCESS=true
```

- **Actual Decoded Value:** `NT-SAN-2026-917201`

---

## 7. UI Hierarchy Evidence

UI dump from physical device (`PJ7POB99FE89BAWS`) after optical scan:
```xml
<node index="0" text="Scanned Tag NT-SAN-2026-917201 • AI Vision: MODEL_UNAVAILABLE • Saved to Room DB (Pending Network Sync)" resource-id="" class="android.widget.TextView" package="com.nirmaltag.app" bounds="[120,496][664,640]" />
```

---

## 8. Test Execution Results

- **Android Unit Tests:** `BUILD SUCCESSFUL` (`gradlew.bat testDebugUnitTest`)
- **Android APK Assembly:** `BUILD SUCCESSFUL` (`gradlew.bat assembleDebug`, 50.9 MB)
- **Physical Device Installation:** `Success` (`adb install -r -g NirmalTag.apk`)
- **Physical Device Execution:** `PASS` (`NT-SAN-2026-917201` optically decoded by ML Kit on `<device-id>`).

---

## Final Verdict

**`REAL PHYSICAL QR AUTO-DETECTION VERIFIED PASS`**
