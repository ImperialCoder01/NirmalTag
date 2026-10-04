# NIRMALTAG — AI DATASET AUDIT REPORT

**Timestamp:** 2026-10-04  
**Dataset Root:** `ai/training/dataset/`  
**Training Readiness:** DATASET COLLECTION REQUIRED  

---

## 1. DATASET INVENTORY SUMMARY

- **Total Files Found:** 0
- **Total Valid Images:** 0
- **Unique SHA-256 Hashes:** 0
- **Quarantined Files:** 0

| Class Name | Total Files | Valid Images | Status (Min: 50) |
| :--- | :---: | :---: | :--- |
| `SANITARY_VISIBLE` | 0 | 0 | INSUFFICIENT (Missing 50) |
| `SPECIAL_CARE_VISIBLE` | 0 | 0 | INSUFFICIENT (Missing 50) |
| `GENERAL_WASTE_VISIBLE` | 0 | 0 | INSUFFICIENT (Missing 50) |
| `EMPTY_OR_UNCLEAR` | 0 | 0 | INSUFFICIENT (Missing 50) |
| `NON_WASTE_OR_INVALID_CAPTURE` | 0 | 0 | INSUFFICIENT (Missing 50) |

---

## 2. QUALITY & PRIVACY VERIFICATION

- **Resolution Requirement:** Minimum 224x224 px (Recommended 640x480 px).
- **Format Verification:** Accepted JPEG, PNG, WebP, BMP.
- **EXIF Privacy Guard:** EXIF metadata must be stripped prior to model training.
- **Duplicate Detection:** SHA-256 hash collision analysis active.

---

## 3. AUDIT CONCLUSION & NEXT STEPS

**DATASET STATUS: INSUFFICIENT DATA FOR TRAINING**

Training requires a minimum of 50 valid domain-specific images per class (250 total minimum).
Refer to `docs/AI_DATASET_SPECIFICATION.md` for image collection and labelling guidelines.

To maintain model truthfulness, the system remains in **`MODEL_UNAVAILABLE`** state.