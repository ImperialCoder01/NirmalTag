# NirmalTag AI Dataset Specification

**Version:** 1.0  
**Maintained by:** NirmalTag Engineering  
**Status:** DATASET COLLECTION REQUIRED — No images collected yet

---

## 1. Purpose

This document defines the image labelling rules, collection guidelines, class definitions, privacy requirements, and quality standards for the NirmalTag On-Device Waste Visual Classifier training dataset.

> [!IMPORTANT]
> Training is **blocked** until each class has ≥ 50 labelled images. The classifier is **MODEL_UNAVAILABLE** until training completes and a valid `.tflite` artifact is placed in `android/app/src/main/assets/`.

---

## 2. Classification Task

The classifier performs **AI-Assisted Visual Verification** based on visible photographic evidence captured by a Collector at pickup time.

**The model does NOT:**
- Determine the contents of sealed or opaque pouches
- Provide a guaranteed classification
- Control credit awards or financial transactions

**The model DOES:**
- Classify what is visually observable in the evidence photograph
- Return a confidence score and predicted class
- Help flag anomalous evidence for human review

---

## 3. Classes

| Index | Label | Description |
| :---: | :--- | :--- |
| 0 | `SANITARY_VISIBLE` | Sanitary/hygiene waste clearly visible: gloves, sanitary pads, diapers, cotton, bandages, disposable hygiene items — in segregated bag/pouch or loose. No medical sharps. |
| 1 | `SPECIAL_CARE_VISIBLE` | Hazardous or special-care waste clearly visible: used batteries, broken glass, sharp objects, pharmaceutical blister packs, electronic waste (e-waste), paint containers. |
| 2 | `GENERAL_WASTE_VISIBLE` | General unsegregated household waste: mixed food wrappers, plastic, general dry waste, organic material, general garbage in a bag or bin. |
| 3 | `EMPTY_OR_UNCLEAR` | No waste visible, empty frame, blurry/out-of-focus to the point of being unclassifiable, partially captured bag with no identifiable content. |
| 4 | `NON_WASTE_OR_INVALID_CAPTURE` | The image is clearly not a waste pickup photo: photo of a wall, ground, sky, person's face, QR code only, phone screen, random object, clearly intentional abuse capture. |

### 3.1 Assignment Rules

- Label the **dominant** visible content.
- When two classes are equally present, prefer the one with higher civic risk (SPECIAL_CARE > SANITARY > GENERAL).
- If in doubt whether image is classifiable, label `EMPTY_OR_UNCLEAR`.
- If the image is deliberately not waste, label `NON_WASTE_OR_INVALID_CAPTURE`.

---

## 4. Image Requirements

### 4.1 Resolution
- Minimum: **640 × 480 px** (VGA)
- Recommended: **1080 × 1080 px** or higher
- Images will be resized to **224 × 224 px** during preprocessing

### 4.2 Format
- Accepted: JPEG, PNG, WebP
- Color mode: RGB (no grayscale)

### 4.3 Diversity Requirements (per class)

Each class must include variation across:

| Dimension | Requirement |
| :--- | :--- |
| **Lighting** | Indoor (artificial), outdoor (daylight, cloudy, dusk) |
| **Distance** | Close-up (< 50 cm), mid-range (50–150 cm), far (> 150 cm) |
| **Angle** | Top-down, 45°, oblique, slight camera tilt |
| **Background** | Street/road, indoor floor, concrete, grass, vehicle floor |
| **Container** | Loose, in bag (opaque), in bag (translucent), in bin, no container |
| **Camera quality** | Low-end phone (2MP–5MP), mid-range (8MP–16MP), high-end (>16MP) |
| **Occlusion** | Full view, partially hidden, partially behind other objects |
| **Time of day** | Morning, afternoon, evening (well-lit only — no extremely dark images) |

### 4.4 Minimum Count

| Class | Minimum for Training | Recommended |
| :--- | :---: | :---: |
| SANITARY_VISIBLE | 50 | 300+ |
| SPECIAL_CARE_VISIBLE | 50 | 300+ |
| GENERAL_WASTE_VISIBLE | 50 | 300+ |
| EMPTY_OR_UNCLEAR | 50 | 200+ |
| NON_WASTE_OR_INVALID_CAPTURE | 50 | 200+ |
| **Total minimum** | **250** | **1,300+** |

---

## 5. Dataset Directory Structure

```
ai/training/dataset/
├── SANITARY_VISIBLE/
│   ├── san_001.jpg
│   ├── san_002.jpg
│   └── ...
├── SPECIAL_CARE_VISIBLE/
│   ├── spc_001.jpg
│   └── ...
├── GENERAL_WASTE_VISIBLE/
│   ├── gen_001.jpg
│   └── ...
├── EMPTY_OR_UNCLEAR/
│   ├── emp_001.jpg
│   └── ...
└── NON_WASTE_OR_INVALID_CAPTURE/
    ├── nwi_001.jpg
    └── ...
```

---

## 6. Data Split

| Split | Ratio | Purpose |
| :--- | :---: | :--- |
| Train | 70% | Model weight updates |
| Validation | 15% | Hyperparameter tuning, early stopping |
| Test | 15% | Final held-out evaluation (reported in model report) |

**Rules:**
- Split is performed **per-class** to avoid class imbalance across splits.
- Images from the same session/device/location should be grouped into the same split where possible.
- Near-duplicate images (same object, consecutive frames) must NOT span train and test.
- Random seed: `42` (fixed in training pipeline).

---

## 7. Data Augmentation

Applied during training only (not validation or test):

| Augmentation | Parameters | Rationale |
| :--- | :--- | :--- |
| Random resized crop | Scale 0.7–1.0, 224×224 | Simulates distance variation |
| Horizontal flip | p=0.5 | Left/right symmetric waste pickup |
| Random rotation | ±15° | Phone tilt during pickup |
| Color jitter | brightness/contrast ±0.3, saturation ±0.2 | Lighting conditions |
| Random perspective | distortion 0.2, p=0.3 | Oblique camera angles |
| Gaussian blur | kernel 3×3, σ=0.1–1.5 | Motion blur / out-of-focus |

**Excluded augmentations:**
- Vertical flip (unnatural for waste photographs)
- Heavy color distortions that change class membership
- Extreme rotations (>45°) that produce unnatural waste images

---

## 8. Exclusion Rules

**Do NOT include:**
- Images containing clearly identifiable human faces (privacy)
- Images containing visible personal documents, IDs, or prescription labels
- Images containing building numbers, street signs with identifiable location
- Images that were clearly taken in medical/clinical facilities (scope creep)
- Duplicate images (identical hash)
- Images below minimum resolution (< 640×480 px)
- Images with purely black or purely white fields
- Synthetic/AI-generated images presented as real waste

---

## 9. Privacy Requirements

- **No faces** visible in dataset images
- **No PII** (names, ID numbers, prescription labels, addresses) visible
- Images should be reviewed by a human annotator before labelling
- Metadata (EXIF GPS coordinates) must be **stripped** before committing to the repository
- For personally-collected images, consent must be obtained if individuals are identifiable

### 9.1 EXIF Stripping (Required)

Before adding images to the dataset:
```bash
# Install: pip install piexif Pillow
# Or use exiftool: exiftool -all= -r ai/training/dataset/
python ai/training/strip_exif.py ai/training/dataset/
```

---

## 10. Labelling Protocol

1. Images are collected by field testers or from open datasets under suitable license.
2. Each image is reviewed by a human annotator using the class definitions in Section 3.
3. Uncertain images are cross-reviewed by a second annotator.
4. If disagreement persists, image is labelled `EMPTY_OR_UNCLEAR` or discarded.
5. Labels are stored implicitly by directory placement.
6. A manifest CSV (`ai/training/dataset/manifest.csv`) records: filename, class, annotator, date, source.

---

## 11. Acceptance Criteria for Production Model

| Metric | Minimum Target |
| :--- | :---: |
| Overall test accuracy | ≥ 85% |
| Macro F1 | ≥ 0.80 |
| Per-class recall (all classes) | ≥ 75% |

If any criterion is not met, the model is classified as **RESEARCH/DEMO ONLY** and must not be deployed as a production classifier.

---

## 12. Licensing

All training images must be collected under one of:
- Original photography taken by NirmalTag team with explicit consent
- Open-access datasets with CC0, CC-BY, or equivalent commercial-compatible license
- Explicitly licensed sources with attribution in `ai/training/dataset/SOURCES.md`

Images from Google Images, social media, or unknown sources are **not permitted**.

---

## 13. Current Status

```
DATASET STATUS: COLLECTION REQUIRED

Classes with ≥ 50 images: 0 / 5
Total images collected  : 0
Training status         : BLOCKED
Model status            : MODEL_UNAVAILABLE
```

To unblock training: collect images per the requirements above and place them in the correct class subdirectories, then run:
```bash
python ai/training/train.py --dataset ai/training/dataset --epochs 30 --seed 42
```
