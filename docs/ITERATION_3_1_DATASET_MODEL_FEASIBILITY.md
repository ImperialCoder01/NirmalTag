# NIRMALTAG — ITERATION 3.1 REPORT
## AI DATASET & MODEL FEASIBILITY AUDIT

**Date**: October 4, 2026  
**Status**: COMPLETED (Feasibility Audit & Dataset Specification)  
**Repository**: `https://github.com/ImperialCoder01/NirmalTag.git`  
**Target Project**: `ubphrqumpqdifupwbvpe`  

---

## 1. EXECUTIVE SUMMARY & DECISION MATRIX

Iteration 3.1 performs a rigorous feasibility audit to determine whether an on-device machine learning visual evidence model can responsibly be trained and integrated for NirmalTag.

| Metric / Audit Field | Audit Result & Status |
|---|---|
| **Training Images in Repository** | **0 images** (`NO TRAINING DATASET AVAILABLE`) |
| **Labeled / Annotated Images** | **0 images** |
| **Physical Pouch Sample Availability** | **NOT AVAILABLE** (`DATASET GENERATION BLOCKED BY MISSING PHYSICAL SAMPLE`) |
| **Observable Task Definition** | **PASS** (`SUPPORTED`, `UNCLEAR`, `CONTRADICTED`) |
| **Model Selection Recommendation** | **PASS** (MobileNetV3-Small INT8 recommended) |
| **Quantization Requirements** | **PASS** (100–200 calibration images required for INT8 PTQ) |
| **Leakage Prevention Design** | **PASS** (Grouped split by `pouch_session_id`) |
| **Safety Critical Metric** | **PASS** (False Positive Rate for `SUPPORTED` $\le 1.0\%$) |
| **FINAL MODEL CREATION DECISION** | **`C. DATASET NOT AVAILABLE — model training cannot responsibly begin.`** |

---

## 2. DATASET FORENSIC AUDIT

A complete forensic scan of the repository was conducted for images (`*.jpg`, `*.png`, `*.webp`), annotation formats (`*.json`, `*.xml`, `*.csv`), and machine learning dataset structures.

### Inventory Results:
- **Total Images**: 0 training dataset images (only app UI branding assets `logo.jpg` exist in `res/drawable`).
- **Labeled Images**: 0
- **Unlabeled Images**: 0
- **Training Images**: 0
- **Validation Images**: 0
- **Test Images**: 0

**Official Status Statement**:  
> **`NO TRAINING DATASET AVAILABLE`**

---

## 3. PHYSICAL SAMPLE AVAILABILITY & DATASET GENERATION BLOCKER

To train a real-world visual classifier, photographs of the actual NirmalTag tamper-evident sanitary pouch (showing physical seal strips, serial placement, plastic texture, and closure mechanics) are required.

- **Physical Sample Status**: No physical sample pouches currently exist in the repository or local physical testing environment.
- **Image Source Blocker**: Arbitrary internet image scraping is strictly prohibited because generic web photos do not correspond to the NirmalTag single-use tamper-evident pouch design.

**Official Blocker Statement**:  
> **`DATASET GENERATION BLOCKED BY MISSING PHYSICAL SAMPLE`**

---

## 4. OBSERVABLE TASK DEFINITION & OBJECTIVE LABELING RULES

The model is strictly an **On-Device Visual Evidence Assistant**. It evaluates **observable visual characteristics** of captured pouches and frame context. It does **NOT** claim to determine hidden pouch contents.

### Model Classification Categories:
1. `OBSERVABLE_EVIDENCE_SUPPORTED`: Visual evidence supports compliant pouch usage.
2. `OBSERVABLE_EVIDENCE_UNCLEAR`: Visual evidence is ambiguous or degraded.
3. `OBSERVABLE_EVIDENCE_CONTRADICTED`: Visual evidence shows non-compliance or damaged pouch.

*(Note: `MODEL_UNAVAILABLE` remains an application runtime state, not a model output class).*

### Objective Labeling Specification:

| Class | Objective Visual Criteria |
|---|---|
| **`SUPPORTED`** | • Tamper-evident seal strip is visibly intact and fully closed.<br>• Pouch surface has no visible tears, punctures, or open slits.<br>• Tamper-evident QR serial code is fully visible within frame reticle.<br>• Container structure matches official NirmalTag pouch geometry. |
| **`UNCLEAR`** | • Motion blur or out-of-focus camera capture.<br>• Extreme lighting glare or deep shadows covering >40% of pouch.<br>• Collector hand/fingers or external object obscuring seal or tag.<br>• Extreme slant angle (>60°) distorting pouch appearance. |
| **`CONTRADICTED`** | • Pouch seal strip is visibly broken, unsealed, or peeled back.<br>• Pouch surface is torn, punctured, or cut open.<br>• Waste items are loose outside the pouch in the collection bin.<br>• Frame contains non-pouch waste or improper non-sanitary containers. |

---

## 5. DATASET SIZE ASSESSMENT & VARIABILITY REQUIREMENTS

To avoid treating dataset size as an arbitrary number, required dataset scale is tiered based on deployment phase:

| Phase | Image Count | Purpose & Scope |
|---|---|---|
| **Minimum Prototype Dataset** | 600 images (200 / class) | Initial feasibility proof, pipeline validation, and TFLite quantization sanity check. |
| **Reasonable Training Dataset** | 3,000 images (1,000 / class) | Baseline field deployment covering primary lighting, distance, and background variations. |
| **Production Dataset** | 9,000+ images (3,000 / class) | High-reliability production deployment across all municipal wards, seasonal lighting, and camera hardware. |

### Required Variability Factors:
- **Lighting**: Outdoor direct sunlight, indoor fluorescent, low-light indoor (<50 lux), deep shadows.
- **Distance & Angle**: 15cm macro, 30cm standard, 60cm distance; 90° top-down, 45° angle.
- **Backgrounds**: Concrete pavement, plastic waste bins, doorstep mats, metal collection carts.
- **Camera Hardware**: Low-end 8MP sensors, mid-range 12MP sensors, high-end 48MP sensors (downsampled).

---

## 6. LEAKAGE-RESISTANT TRAIN / VALIDATION / TEST SPLIT

To prevent artificially inflated accuracy metrics, images must be split using a **Grouped Split Strategy** based on `pouch_session_id`.

- **Group Key**: `pouch_session_id` (Unique identifier for a physical pouch capture session).
- **Leakage Prevention Rule**: All photos of the same physical pouch (taken from different angles or lighting during one capture session) **MUST** remain in the same split group. They must **NEVER** be mixed across train and test sets.

### Dataset Split Ratio:
- **Training Set**: 70% of pouch session groups
- **Validation Set**: 15% of pouch session groups
- **Test Set**: 15% of pouch session groups

---

## 7. AUGMENTATION STRATEGY

To improve generalization without altering class meanings:

### Approved Augmentations:
- Random Brightness ($\pm 15\%$) & Contrast ($\pm 15\%$)
- Subtle Rotation ($\pm 15^\circ$)
- Mild Gaussian Blur ($\sigma \le 1.0$)
- Small Translation / Shift ($\pm 10\%$)
- Color Temperature Jitter ($\pm 10\%$)

### Prohibited Augmentations:
- **Vertical Flipping**: Upside-down pouches alter the natural visual gravity appearance of sealed tops.
- **Severe Cropping**: Cutting off the seal region would turn a `SUPPORTED` pouch into an `UNCLEAR` or unidentifiable frame.
- **Color Inversion**: Destroys color signals of warning labels and QR tag borders.

---

## 8. MODEL ARCHITECTURE COMPARISON & SELECTION

| Model Candidate | Model Size (INT8) | CPU Latency (Cortex-A53) | RAM Footprint | Top-1 Accuracy Potential | TFLite PTQ Support | Recommendation |
|---|---|---|---|---|---|---|
| **MobileNetV3-Small** | **~3.2 MB** | **35ms – 50ms** | **< 20 MB** | **~75.4%** | **Excellent** | **RECOMMENDED** |
| **MobileNetV2** | ~5.2 MB | 65ms – 90ms | < 28 MB | ~72.0% | Excellent | Alternative |
| **EfficientNet-Lite0** | ~17.5 MB | 110ms – 160ms | < 45 MB | ~77.1% | Good | Rejected (Too heavy for CPU) |
| **SqueezeNet v1.1** | ~4.8 MB | 30ms – 45ms | < 18 MB | ~58.2% | Fair | Rejected (Poor accuracy) |

**Selection Confirmation**: **MobileNetV3-Small INT8** remains the optimal target architecture for budget Android mobile hardware once training data is acquired.

---

## 9. QUANTIZATION STRATEGY

- **Target Format**: Full Integer INT8 Quantization (Post-Training Quantization).
- **Representative Calibration Dataset Requirement**: PTQ requires a representative calibration dataset of **100–200 unlabeled pouch images** fed to the TensorFlow Lite Converter to accurately compute dynamic range scaling factors ($S$) and zero-points ($Z$):
  $$q = \text{round}\left(\frac{r}{S}\right) + Z$$
- **Pre-requisite**: INT8 quantization cannot be executed until physical dataset images exist.

---

## 10. SUCCESS METRICS & SAFETY THRESHOLDS

Because misclassifying a damaged/open pouch as `SUPPORTED` poses a sanitation and compliance risk:

### Evaluation Metrics:
- **Primary Metrics**: Precision, Recall, F1-Score per class, and Confusion Matrix.
- **Critical Safety Metric**: **False Positive Rate (FPR) for `SUPPORTED` $\le 1.0\%$**.
  $$\text{FPR}_{\text{SUPPORTED}} = \frac{\text{CONTRADICTED classified as SUPPORTED}}{\text{Total CONTRADICTED samples}} \le 0.01$$

---

## 11. CONFIDENCE THRESHOLD & UNCERTAINTY POLICY

Model confidence output $P(\text{class})$ derived from Softmax probabilities is mapped as follows:

```
P(SUPPORTED) >= 0.85     --> OBSERVABLE_EVIDENCE_SUPPORTED
P(CONTRADICTED) >= 0.85  --> OBSERVABLE_EVIDENCE_CONTRADICTED
0.00 < P < 0.85          --> OBSERVABLE_EVIDENCE_UNCLEAR (Triggers REQUIRES_REVIEW)
```

---

## 12. HUMAN REVIEW, PRIVACY & MODEL UPDATES

### Status Classification Rules:
- `MODEL_UNAVAILABLE`: Application-level state when TFLite model asset is unpopulated or fails execution.
- `OBSERVABLE_EVIDENCE_UNCLEAR`: AI model executed, but visual confidence is below 0.85.
- `REQUIRES_REVIEW`: Routing state for manual officer review.

### Privacy & Security Constraints:
- 100% on-device processing. No raw evidence images sent to cloud AI APIs.
- Model asset packaged as read-only inside APK `assets/mobilenetv3_sanitary_quant.tflite`.
- Model updates must include SHA-256 manifest verification before interpreter instantiation.

---

## 13. ACTUAL MODEL CREATION DECISION

Based on the forensic audit confirming 0 training images in the repository and 0 physical pouch samples:

### **SELECTED DECISION**:
> ### **`C. DATASET NOT AVAILABLE — model training cannot responsibly begin.`**

---

## 14. CONCLUSION

Iteration 3.1 is COMPLETE. The forensic audit confirmed `NO TRAINING DATASET AVAILABLE` and `DATASET GENERATION BLOCKED BY MISSING PHYSICAL SAMPLE`. Model training cannot responsibly begin until physical sample pouches are acquired and a representative 3,000-image dataset is collected and labeled.
