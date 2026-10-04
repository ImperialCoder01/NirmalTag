# NIRMALTAG — ITERATION 21: REAL DOMAIN-SPECIFIC AI VISUAL CLASSIFIER

**Timestamp:** 2026-10-04  
**Status: NIRMALTAG AI CLASSIFIER — INFRASTRUCTURE READY, MODEL UNAVAILABLE**

---

## 1. Forensic Audit Results

Before implementing anything, a complete forensic audit of the existing codebase was performed.

### 1.1 Model Inventory

| Location | Finding |
| :--- | :--- |
| `android/app/src/main/assets/` | **Directory did not exist** — no `.tflite`, `.onnx`, `.task`, or model of any kind |
| Repository root | **0 model files** found |
| `android/` recursively | **0 model files** found |

**Conclusion:** No pre-existing machine learning model artifact exists anywhere in the repository.

### 1.2 Existing AI Infrastructure (Pre-Iteration-21)

| Component | File | State |
| :--- | :--- | :--- |
| `VisualVerificationEngine` | [`ai/VisualVerificationEngine.kt`](file:///d:/LOQ/Documents/WasteChakra/android/app/src/main/java/com/nirmaltag/app/ai/VisualVerificationEngine.kt) | Stub — correctly returned `MODEL_UNAVAILABLE` when no asset present. No actual TFLite inference. |
| `VisionClassifier` | [`ai/VisionClassifier.kt`](file:///d:/LOQ/Documents/WasteChakra/android/app/src/main/java/com/nirmaltag/app/ai/VisionClassifier.kt) | Facade delegating to engine |
| `PendingPickupEntity` | [`data/local/PendingPickupEntity.kt`](file:///d:/LOQ/Documents/WasteChakra/android/app/src/main/java/com/nirmaltag/app/data/local/PendingPickupEntity.kt) | Already stores `aiStatus`, `aiConfidence`, `aiInferenceMs` |
| TFLite dependency | `build.gradle.kts` | `org.tensorflow:tensorflow-lite:2.14.0` and `tensorflow-lite-support:0.4.4` already declared |
| Existing confidence values | `MainActivity.kt` | `dummyBitmap` used — **not real evidence image**. `confidence = 0.50f` was a placeholder. Correctly reported `MODEL_UNAVAILABLE` in UI. |

### 1.3 Answer to Each Forensic Question

| Question | Answer |
| :--- | :--- |
| Does a model already exist? | **NO** |
| Where is it stored? | **Nowhere** |
| What input size does it require? | Specified in code: **224 × 224** (MobileNetV3-Small) |
| What labels does it output? | Not yet defined (no model) |
| What preprocessing does it require? | ImageNet normalization — already coded |
| Is it actually loaded by Android? | **NO** — asset not present |
| Is inference actually executed? | **NO** |
| Is the current confidence value real? | **NO** — `0.50f` was a placeholder, never faked as real |

---

## 2. Classification Task Definition

The classifier performs **AI-Assisted Visual Verification** — not guaranteed content determination.

> [!IMPORTANT]
> The model classifies **what is visually observable** in the evidence photograph.
> It does **NOT** prove the complete contents of a sealed or opaque pouch.
> The model is not the authoritative pickup verification authority — the server-side transaction is.

### Classes (5 total)

| Index | Label | Description |
| :---: | :--- | :--- |
| 0 | `SANITARY_VISIBLE` | Sanitary/hygiene waste clearly visible |
| 1 | `SPECIAL_CARE_VISIBLE` | Hazardous/special-care waste clearly visible |
| 2 | `GENERAL_WASTE_VISIBLE` | General unsegregated household waste |
| 3 | `EMPTY_OR_UNCLEAR` | No waste visible, blurry, or unclassifiable |
| 4 | `NON_WASTE_OR_INVALID_CAPTURE` | Clearly not a waste pickup photo |

---

## 3. Model Architecture

| Property | Value |
| :--- | :--- |
| Architecture | **MobileNetV3-Small** (depthwise separable convolutions) |
| Base weights | ImageNet1K V1 (transfer learning) |
| Fine-tuning | Replace classifier head → 5 NirmalTag classes |
| Input | 224 × 224 × 3, float32, ImageNet-normalized |
| Output | 5-element logit vector → softmax → argmax |
| Export format | ONNX opset 11 → **TFLite INT8 quantized** |
| Target latency | < 500ms on Snapdragon 439 (OPPO A15s, Android 10) |

### Why MobileNetV3-Small?

MobileNetV3-Small was selected over MobileNetV2 and EfficientNet-Lite because:
- ~3.5M parameters — minimal APK size impact
- Hardware-accelerated via TFLite XNNPACK delegate on ARM
- Supported on Android API 21+ without additional native dependencies
- INT8 quantization yields ~4× size reduction and faster inference on CPUs

---

## 4. Training Pipeline

Created in `ai/training/`:

| File | Purpose |
| :--- | :--- |
| [`train.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/train.py) | Complete training + evaluation + ONNX export pipeline |
| [`export_tflite.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/export_tflite.py) | Standalone TFLite conversion + Android asset installation |
| [`validate.py`](file:///d:/LOQ/Documents/WasteChakra/ai/training/validate.py) | Holdout test-set validation against installed TFLite model |

### Training Pipeline Features

- **Fixed seed:** `42` for full reproducibility
- **Transfer learning:** MobileNetV3-Small ImageNet weights → fine-tuned head
- **Class imbalance handling:** `WeightedRandomSampler` + inverse-frequency `CrossEntropyLoss` weights
- **Data augmentation:** random crop, horizontal flip, rotation, color jitter, perspective, gaussian blur
- **Per-class split:** 70/15/15 train/val/test — no leakage across splits
- **Best checkpoint:** saved on best validation macro F1 (not just accuracy)
- **Honest stop condition:** exits with code 2 if any class has < 50 images
- **Full evaluation:** accuracy, precision, recall, F1, confusion matrix — all per-class

### Training Command

```bash
pip install torch torchvision scikit-learn tqdm onnx tensorflow onnx-tf
python ai/training/train.py --dataset ai/training/dataset --epochs 30 --seed 42
```

---

## 5. Dataset Status

> [!CAUTION]
> **TRAINING BLOCKED — INSUFFICIENT DOMAIN-SPECIFIC TRAINING DATA**

| Class | Images Available | Minimum Required |
| :--- | :---: | :---: |
| SANITARY_VISIBLE | **0** | 50 |
| SPECIAL_CARE_VISIBLE | **0** | 50 |
| GENERAL_WASTE_VISIBLE | **0** | 50 |
| EMPTY_OR_UNCLEAR | **0** | 50 |
| NON_WASTE_OR_INVALID_CAPTURE | **0** | 50 |
| **Total** | **0** | **250** |

Dataset collection requirements are fully specified in [`docs/AI_DATASET_SPECIFICATION.md`](file:///d:/LOQ/Documents/WasteChakra/docs/AI_DATASET_SPECIFICATION.md).

---

## 6. VisualVerificationResult Output Contract

The new output contract — returned by every code path, no exceptions:

```kotlin
data class VisualVerificationResult(
    val status: AiVerificationStatus,   // CLASSIFIED | LOW_CONFIDENCE | INFERENCE_FAILED |
                                        // INVALID_IMAGE | MODEL_LOAD_FAILED | MODEL_UNAVAILABLE
    val predictedClass: WasteClass,     // SANITARY_VISIBLE | SPECIAL_CARE_VISIBLE | ...
    val confidence: Float,              // Always 0.0f when model unavailable/failed
    val modelVersion: String,           // "nirmaltag-v1" or "MODEL_UNAVAILABLE"
    val inferenceTimeMs: Long,          // Wall-clock time (ms) of full inference call
    val isModelAvailable: Boolean,      // false = .tflite asset missing from APK
    val isDomainModel: Boolean,         // true = NirmalTag-specific model
    val thresholdPassed: Boolean,       // confidence >= 0.80
    val timestamp: Long                 // System.currentTimeMillis() at result creation
)
```

> [!IMPORTANT]
> This result contains **NO credit, reward, or incentive fields**.
> AI confidence **NEVER** directly controls financial outcomes.
> The server-side pickup transaction is the sole financial authority.

---

## 7. Failure State Matrix

| Condition | Status | confidence | isModelAvailable |
| :--- | :--- | :---: | :---: |
| `.tflite` not in APK | `MODEL_UNAVAILABLE` | `0.0f` | `false` |
| `.tflite` present, load failed | `MODEL_LOAD_FAILED` | `0.0f` | `true` |
| Null/zero-dimension bitmap | `INVALID_IMAGE` | `0.0f` | `true` |
| `interpreter.run()` exception | `INFERENCE_FAILED` | `0.0f` | `true` |
| Inference succeeded, conf < 0.80 | `LOW_CONFIDENCE` | `> 0.0f` | `true` |
| Inference succeeded, conf ≥ 0.80 | `CLASSIFIED` | `≥ 0.80f` | `true` |

---

## 8. Confidence Threshold

```kotlin
const val AI_CONFIDENCE_THRESHOLD = 0.80f
```

- `confidence >= 0.80` → `thresholdPassed = true` → UI shows class + percentage
- `confidence < 0.80` → `LOW_CONFIDENCE` → UI shows "UNCERTAIN"
- `!isModelAvailable` → `MODEL_UNAVAILABLE` → UI shows grey banner

---

## 9. Android Integration Changes

### VisualVerificationEngine.kt — Rewritten
- Real `TFLite Interpreter` loading via `FileUtil.loadMappedFile()`
- Real `ByteBuffer` preprocessing with ImageNet normalization
- Real softmax applied to output logits
- All six failure states handled with safe fallback
- `close()` method for interpreter resource cleanup

### VisionClassifier.kt — Updated
- Exposes `isModelAvailable()` and `close()` to callers

### MainActivity.kt — Updated
- `aiEngine.close()` called after inference
- AI result logged with full structured fields
- UI summary string reflects real outcome:
  - `"AI Visual Verification: Sanitary Visible 91% (nirmaltag-v1)"` when CLASSIFIED
  - `"AI Visual Verification: UNCERTAIN 67% confidence"` when LOW_CONFIDENCE
  - `"AI Visual Verification: MODEL_UNAVAILABLE"` when no model

---

## 10. Unit Tests

[`VisualVerificationEngineTest.kt`](file:///d:/LOQ/Documents/WasteChakra/android/app/src/test/java/com/nirmaltag/app/VisualVerificationEngineTest.kt) — **12 tests covering all requirements:**

| Requirement | Test |
| :--- | :--- |
| R1: MODEL_UNAVAILABLE → confidence = 0.0f | ✓ |
| R2: MODEL_UNAVAILABLE → isDomainModel = false | ✓ |
| R3: MODEL_UNAVAILABLE → thresholdPassed = false | ✓ |
| R4: CLASSIFIED → confidence ≥ threshold | ✓ |
| R5: LOW_CONFIDENCE → confidence < threshold | ✓ |
| R6: No negative confidence across all statuses | ✓ |
| R7: MODEL_LOAD_FAILED ≠ MODEL_UNAVAILABLE | ✓ |
| R8: INFERENCE_FAILED ≠ MODEL_UNAVAILABLE | ✓ |
| R9: INVALID_IMAGE ≠ MODEL_UNAVAILABLE | ✓ |
| R10: WasteClass.fromLabel — all 5 classes + UNKNOWN fallback | ✓ |
| R11: Confidence threshold == 0.80 | ✓ |
| R12: VisualVerificationResult has no credit/reward field | ✓ |

---

## 11. Build & Regression Results

| Suite | Command | Result |
| :--- | :--- | :--- |
| Web unit + RLS tests | `node --env-file=.env.local --test tests/*.test.mjs` | **54/54 PASS** |
| Android unit tests | `.\gradlew.bat test` | **BUILD SUCCESSFUL** (54 tasks) |
| Android release APK | `.\gradlew.bat assembleRelease` | **BUILD SUCCESSFUL** in 47s |

---

## 12. Model Artifact Status

| Artifact | Location | Status |
| :--- | :--- | :--- |
| TFLite model | `android/app/src/main/assets/nirmaltag_waste_classifier_v1.tflite` | **MISSING** (training blocked) |
| Labels | `android/app/src/main/assets/labels.txt` | **MISSING** |
| Manifest | `android/app/src/main/assets/model_manifest.json` | **MISSING** |
| Model SHA-256 | N/A | **NOT COMPUTABLE** (no model) |
| Training checkpoint | `ai/training/output/best_model.pt` | **NOT YET PRODUCED** |

---

## 13. Acceptance Criteria Status

| Requirement | Status |
| :--- | :--- |
| Real domain-specific dataset | ❌ 0 images collected |
| Reproducible training pipeline | ✅ `ai/training/train.py` |
| Real trained model | ❌ Training blocked by dataset |
| Real evaluation | ❌ No model to evaluate |
| Confusion matrix | ❌ No model |
| Per-class metrics | ❌ No model |
| Real `.tflite` artifact | ❌ No model |
| Model SHA-256 hash | ❌ No model |
| Android model loading | ✅ `VisualVerificationEngine.kt` — real TFLite code |
| Real inference code | ✅ Complete — activates when model asset is present |
| Real confidence | ❌ No model to produce real confidence |
| Physical device inference | ❌ Device present, but no model to test |
| AI result stored in Room | ✅ `PendingPickupEntity` stores all AI fields |
| AI result survives offline queue | ✅ WorkManager sync preserved |
| Web shows actual AI state | ✅ MODEL_UNAVAILABLE shown correctly |
| No fake confidence | ✅ Confidence is `0.0f` — truthfully reported |
| Existing Collector flow preserved | ✅ No changes to QR/Room/WorkManager |
| Existing server transaction preserved | ✅ |
| Tests pass | ✅ All suites green |
| Release APK builds | ✅ |
| Documentation complete | ✅ |

---

## 14. Final Verdict

```
================================================================
NIRMALTAG AI CLASSIFIER — INFRASTRUCTURE READY, MODEL UNAVAILABLE

Reason: Insufficient domain-specific training data.
        0 of 5 classes have ≥ 50 images.

Current runtime behavior:
  MODEL_UNAVAILABLE is correctly and honestly displayed.
  No fake confidence values exist anywhere in the codebase.

To unblock:
  1. Collect ≥ 50 images per class (see docs/AI_DATASET_SPECIFICATION.md)
  2. Run: python ai/training/train.py --dataset ai/training/dataset
  3. Run: python ai/training/export_tflite.py
  4. Run: .\gradlew.bat assembleRelease
  5. Install and verify on OPPO A15s
================================================================
```

---

## 15. Honesty Statement

Per the Iteration 21 Final Principle:

> The current MODEL_UNAVAILABLE state is better than fake AI.

This iteration does NOT:
- ❌ Manufacture fake confidence values
- ❌ Use a generic ImageNet model labeled as NirmalTag AI
- ❌ Fabricate accuracy metrics or confusion matrices
- ❌ Pretend training was completed
- ❌ Call `MODEL_UNAVAILABLE` a defect — it is the correct honest state

This iteration DOES:
- ✅ Implement complete real TFLite inference infrastructure
- ✅ Define the complete dataset specification
- ✅ Create a fully reproducible training pipeline
- ✅ Expand the output contract with all required fields
- ✅ Test all six failure states
- ✅ Maintain truthful `MODEL_UNAVAILABLE` until real data exists
