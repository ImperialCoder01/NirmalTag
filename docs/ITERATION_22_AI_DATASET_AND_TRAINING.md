# NIRMALTAG — ITERATION 22: AI CLASSIFIER COMPLETION, DATASET PIPELINE & TRAINING REPORT

**Timestamp:** 2026-10-04  
**Project:** NirmalTag (WasteChakra)  
**Status:** `NIRMALTAG AI CLASSIFIER — INFRASTRUCTURE READY, MODEL UNAVAILABLE`

---

## 1. FORENSIC RESUME & INFRASTRUCTURE VERIFICATION

Following the completion of Iteration 21 in commit `668b0b9`, a comprehensive forensic audit of the repository was executed.

### 1.1 Installed Tooling & Components
- **Training Pipeline:** [`ai/training/train.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/train.py) — PyTorch MobileNetV3-Small fine-tuning pipeline with weighted random sampling, ImageNet normalization, augmentation, per-class train/val/test splits, and dataset minimum check.
- **Dataset Quality Audit Tool:** [`ai/training/audit_dataset.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/audit_dataset.py) — Scans dataset, checks minimum resolutions ($\ge 224 \times 224$), formats, EXIF tags, SHA-256 hash collision duplicates, and outputs [`docs/AI_DATASET_AUDIT.md`](file:///d:/LOQ/Documents/WasteChakra/docs/AI_DATASET_AUDIT.md).
- **TFLite Export Script:** [`ai/training/export_tflite.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/export_tflite.py) — ONNX intermediate export + TensorFlow Lite INT8 quantization + Android asset installer.
- **Test-Set Validation Tool:** [`ai/training/validate.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/validate.py) — Runs holdout evaluation on installed `.tflite` model returning per-class precision, recall, F1, and confusion matrix.
- **EXIF Privacy Stripper:** [`ai/training/strip_exif.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/strip_exif.py) — Removes GPS/device metadata from raw training photos prior to commit.
- **Android Inference Engine:** [`VisualVerificationEngine.kt`](file:///d:/LOQ/Documents/WasteChakra/android/app/src/main/java/com/nirmaltag/app/ai/VisualVerificationEngine.kt) — Real TFLite `Interpreter` with `ByteBuffer` preprocessing, ImageNet normalization, softmax probabilities, $0.80$ confidence gate, and 6 failure states (`MODEL_UNAVAILABLE`, `MODEL_LOAD_FAILED`, `INVALID_IMAGE`, `INFERENCE_FAILED`, `LOW_CONFIDENCE`, `CLASSIFIED`).
- **Android Unit Tests:** [`VisualVerificationEngineTest.kt`](file:///d:/LOQ/Documents/WasteChakra/android/app/src/test/java/com/nirmaltag/app/VisualVerificationEngineTest.kt) — 12 unit tests verifying contract invariants, failure states, threshold gates, and structural isolation from financial credit rewards.

---

## 2. MODEL CONTRACT & CLASS ORDERING

Class index order is 100% synchronized across training (`train.py`), export (`export_tflite.py`), evaluation (`validate.py`), and Android runtime (`VisualVerificationEngine.kt`):

| Index | Class Label | Display Name | Visual Scope |
| :---: | :--- | :--- | :--- |
| **0** | `SANITARY_VISIBLE` | Sanitary Visible | Visible diapers, pads, gloves, bandages, hygiene products |
| **1** | `SPECIAL_CARE_VISIBLE` | Special Care Visible | Visible batteries, broken glass, e-waste, sharps, pharmaceuticals |
| **2** | `GENERAL_WASTE_VISIBLE` | General Waste Visible | Visible unsegregated mixed household garbage, wrappers |
| **3** | `EMPTY_OR_UNCLEAR` | Empty or Unclear | Blur, empty frame, obscured pouch, unclassifiable evidence |
| **4** | `NON_WASTE_OR_INVALID_CAPTURE` | Non-Waste / Invalid Capture | Non-waste photo (faces, walls, sky, phone screen, abuse) |

### Tensor Contract
- **Input Tensor:** `[1 × 224 × 224 × 3]`, Float32, ImageNet normalized (`mean = [0.485, 0.456, 0.406]`, `std = [0.229, 0.224, 0.225]`).
- **Output Tensor:** `[1 × 5]`, Float32 logits $\rightarrow$ Softmax probability distribution.
- **Confidence Gate:** `AI_CONFIDENCE_THRESHOLD = 0.80f`. Results below 80% confidence yield status `LOW_CONFIDENCE` (UI display: `UNCERTAIN`).

---

## 3. DATASET AUDIT & INVENTORY

The dataset quality audit tool ([`ai/training/audit_dataset.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/audit_dataset.py)) was executed against `ai/training/dataset/`:

```
====================================================================
  NIRMALTAG AI DATASET AUDIT SUMMARY
====================================================================
  Total Files Found   : 0
  Total Valid Images  : 0
  Unique SHA-256      : 0
  Quarantined Files   : 0
  Training Readiness  : DATASET COLLECTION REQUIRED
====================================================================
```

| Class Directory | Images Present | Minimum Required | Status |
| :--- | :---: | :---: | :--- |
| `ai/training/dataset/SANITARY_VISIBLE/` | **0** | 50 | `INSUFFICIENT (Missing 50)` |
| `ai/training/dataset/SPECIAL_CARE_VISIBLE/` | **0** | 50 | `INSUFFICIENT (Missing 50)` |
| `ai/training/dataset/GENERAL_WASTE_VISIBLE/` | **0** | 50 | `INSUFFICIENT (Missing 50)` |
| `ai/training/dataset/EMPTY_OR_UNCLEAR/` | **0** | 50 | `INSUFFICIENT (Missing 50)` |
| `ai/training/dataset/NON_WASTE_OR_INVALID_CAPTURE/` | **0** | 50 | `INSUFFICIENT (Missing 50)` |

> [!CAUTION]
> **TRAINING BLOCKED BY DATASET STOP CONDITION**  
> Per security and truthfulness rules, no fake images, generic ImageNet files, or synthetic images were injected into the dataset. The pipeline enforced the stop condition and halted model training truthfully.

---

## 4. STATUS BREAKDOWN

| Dimension | Status | Detail |
| :--- | :---: | :--- |
| **A. Infrastructure Completed** | **PASS** | `train.py`, `audit_dataset.py`, `export_tflite.py`, `validate.py`, `VisualVerificationEngine.kt` fully implemented |
| **B. Dataset Status** | **DATASET COLLECTION REQUIRED** | 0 domain-specific images in repository (min 250 required) |
| **C. Training Status** | **BLOCKED BY DATASET** | Pipeline correctly aborted training on empty dataset check |
| **D. Evaluation Status** | **PENDING DATASET** | Held-out validation pending model production |
| **E. Model Export Status** | **PENDING DATASET** | TFLite conversion ready upon `best_model.pt` generation |
| **F. Android Inference Status** | **PASS** | `VisualVerificationEngine.kt` ready to execute TFLite model upon asset placement |
| **G. Physical Device Status** | **PASS** | OPPO A15s (Android 10 / API 29) release APK compiled & verified |
| **H. Remaining Blocker** | **DATASET ACQUISITION** | Requires 50+ annotated field photos per class |

---

## 5. AUTOMATED TEST & REGRESSION RESULTS

| Test Suite | Execution Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Web Unit & RLS Tests** | `node --env-file=.env.local --test tests/*.test.mjs` | **54/54 PASS** | All security, RLS, and auth tests green |
| **Android Unit Tests** | `.\gradlew.bat test` | **BUILD SUCCESSFUL** | 54 tasks green, `VisualVerificationEngineTest` 12/12 PASS |
| **Android Release Build** | `.\gradlew.bat assembleRelease` | **BUILD SUCCESSFUL** | Signed Release APK compiled in 11s |
| **Dataset Ingestion Audit** | `python ai/training/audit_dataset.py` | **PASS** | Generated `docs/AI_DATASET_AUDIT.md` |
| **Training Pipeline Check** | `python ai/training/train.py` | **PASS (BLOCKED)** | Verified honest `TRAINING BLOCKED` stop condition |

---

## 6. FINAL ACCEPTANCE VERDICT

```
====================================================================
FINAL VERDICT: NIRMALTAG AI CLASSIFIER — INFRASTRUCTURE READY, MODEL UNAVAILABLE
====================================================================
```

### Steps to Train Production Model When Dataset is Populated:
1. Populate `ai/training/dataset/<CLASS_NAME>/` with $\ge 50$ images per class (250 minimum).
2. Run `python ai/training/audit_dataset.py` to verify image resolution and strip EXIF tags.
3. Run `python ai/training/train.py --dataset ai/training/dataset --epochs 30` to train PyTorch backbone.
4. Run `python ai/training/export_tflite.py` to convert PyTorch $\rightarrow$ ONNX $\rightarrow$ TFLite INT8 and copy to `android/app/src/main/assets/`.
5. Run `python ai/training/validate.py` to verify held-out test accuracy ($\ge 85\%$) and macro F1 ($\ge 0.80$).
6. Run `.\gradlew.bat assembleRelease` to package `.tflite` asset into release APK.
