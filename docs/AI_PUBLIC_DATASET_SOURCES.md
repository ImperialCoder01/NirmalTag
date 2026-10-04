# NirmalTag AI — Public Dataset Sources Directory

**Version:** 1.0  
**Maintained by:** NirmalTag Engineering  
**Status:** AUDITED FOR RESEARCH & PROTOTYPING

---

## 1. Overview

This document tracks all publicly available waste-image datasets evaluated for NirmalTag research, baseline data preparation, and target class mapping.

> [!IMPORTANT]
> Public datasets provide baseline data primarily for `GENERAL_WASTE_VISIBLE` and negative classes (`EMPTY_OR_UNCLEAR`, `NON_WASTE_OR_INVALID_CAPTURE`).
> Domain-specific categories (`SANITARY_VISIBLE` and `SPECIAL_CARE_VISIBLE`) require real field photography collected per `docs/AI_MANUAL_DATA_COLLECTION_PLAN.md`.

---

## 2. Audited Public Datasets

### A. TACO (Trash Annotations in Context)
- **Official URL:** [tacodataset.org](https://tacodataset.org)
- **Repository:** [github.com/pedropro/TACO](https://github.com/pedropro/TACO)
- **License:** **MIT License**
- **Commercial Use Permitted:** Yes
- **Redistribution Permitted:** Yes
- **Derivative Works Permitted:** Yes
- **Citation:** Proença, P., & Simões, P. (2019). *TACO: Trash Annotations in Context for Litter Detection*. arXiv preprint arXiv:2003.03396.
- **Image Count:** ~1,500 high-resolution annotated images (4,784 segmentation masks)
- **Annotations:** COCO format JSON (`annotations.json`)
- **NirmalTag Class Mapping:**
  - `Battery`, `Blister pack` $\rightarrow$ `SPECIAL_CARE_VISIBLE` (`approved`)
  - `Plastic bag`, `Can`, `Bottle`, `Carton`, `Unlabeled litter` $\rightarrow$ `GENERAL_WASTE_VISIBLE` (`approved`)
  - `tissue` $\rightarrow$ `SANITARY_VISIBLE` (`manual_review` — quarantined)

---

### B. TrashNet (Mindful Garbage Classification)
- **Official URL:** [github.com/garythung/trashnet](https://github.com/garythung/trashnet)
- **License:** **MIT License**
- **Commercial Use Permitted:** Yes
- **Redistribution Permitted:** Yes
- **Derivative Works Permitted:** Yes
- **Citation:** Thung, G., & Yang, M. (2016). *Classification of Trash for Recyclability Status*. Stanford CS229 Project Report.
- **Image Count:** 2,527 images
- **Categories:** 6 classes (`cardboard` [403], `glass` [501], `metal` [410], `paper` [594], `plastic` [482], `trash` [137])
- **Resolution:** 512 × 384 px
- **NirmalTag Class Mapping:**
  - All 6 classes $\rightarrow$ `GENERAL_WASTE_VISIBLE` (`approved`)

---

### C. Waste Classification Dataset (Tech4Good / Kaggle)
- **Official URL:** [kaggle.com/datasets/techsocr/waste-classification-data](https://www.kaggle.com/datasets/techsocr/waste-classification-data)
- **License:** **CC0: Public Domain**
- **Commercial Use Permitted:** Yes
- **Redistribution Permitted:** Yes
- **Derivative Works Permitted:** Yes
- **Citation:** Kaggle Waste Classification Dataset, Tech4Good.
- **Image Count:** 22,500 images
- **Categories:** `Organic` (12,565), `Recyclable` (9,935)
- **NirmalTag Class Mapping:**
  - `Organic`, `Recyclable` $\rightarrow$ `GENERAL_WASTE_VISIBLE` (`approved`)

---

## 3. Directory Separation Architecture

To prevent unverified public data from polluting curated NirmalTag field data:

```
ai/training/
├── public_sources/        <-- Downloaded raw public datasets (gitignored)
│   ├── taco/
│   ├── trashnet/
│   └── manifest.json
├── dataset/               <-- Curated target training dataset
│   ├── SANITARY_VISIBLE/
│   ├── SPECIAL_CARE_VISIBLE/
│   ├── GENERAL_WASTE_VISIBLE/
│   ├── EMPTY_OR_UNCLEAR/
│   └── NON_WASTE_OR_INVALID_CAPTURE/
├── public_dataset_manifest.json
└── dataset_mapping.json
```

---

## 4. Summary Matrix

| Dataset | Total Images | License | Commercial | Derivative | NirmalTag Target Mapping |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **TACO** | 1,500 | MIT | Yes | Yes | `SPECIAL_CARE_VISIBLE` / `GENERAL_WASTE_VISIBLE` |
| **TrashNet** | 2,527 | MIT | Yes | Yes | `GENERAL_WASTE_VISIBLE` |
| **Kaggle Tech4Good** | 22,500 | CC0 | Yes | Yes | `GENERAL_WASTE_VISIBLE` |
