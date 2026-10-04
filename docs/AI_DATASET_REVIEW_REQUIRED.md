# NirmalTag AI — Datasets & Classes Requiring Review

**Version:** 1.0  
**Maintained by:** NirmalTag Engineering  
**Status:** ACTIVE AUDIT LOG

---

## 1. Overview

This document records public datasets, specific classes, or candidate image sources whose licensing, semantic mapping, or visual content is restricted, ambiguous, or requires explicit human review before inclusion in the curated training set.

---

## 2. Quarantined & Review-Required Class Mappings

| Source Dataset | Source Class | Proposed Target Class | Problem / Reason | Required Action |
| :--- | :--- | :--- | :--- | :--- |
| **TACO** | `tissue` | `SANITARY_VISIBLE` | Semantic mismatch: General paper tissues in TACO represent litter, not sealed sanitary/hygiene pouch waste. | Keep in `manual_review` status. Do not auto-ingest into `SANITARY_VISIBLE`. |
| **Generic Kaggle Scrapes** | Various | Various | License UNKNOWN or unverified terms of service. | Do NOT download or import. Reject unverified web scrapes. |
| **Medical Image Repositories** | Clinical sharps | `SPECIAL_CARE_VISIBLE` | Privacy/graphic content: Clinical hospital photography is out of scope for household waste collection. | Scope restriction: Reject medical/hospital datasets. Focus on household e-waste/batteries. |

---

## 3. License Safety Protocol

1. Datasets with `UNKNOWN`, `RESTRICTED`, or non-commercial licenses must remain in `docs/AI_DATASET_REVIEW_REQUIRED.md`.
2. Never automatically mix review-required datasets into `ai/training/dataset/`.
3. All ingested images must have traceable entries in `dataset_mapping.json`.
