# NirmalTag — Manual Data Collection Plan (Hackathon Guide)

**Author:** NirmalTag Engineering  
**Target Event:** Next Hackathon / Field Demo Round  
**Objective:** Collect real, domain-specific household waste photographs to train the production `nirmaltag_waste_classifier_v1.tflite` model.

---

## 1. Collection Targets & Thresholds

| Stage | Per-Class Target | Total Dataset Target | Status Gate |
| :--- | :---: | :---: | :--- |
| **Minimum Prototype** | **50 images** | **250 images** | Unblocks prototype training (`ai/training/train.py`) |
| **Recommended Production** | **500+ images** | **2,500+ images** | High accuracy ($\ge 85\%$) & robust field generalization |

---

## 2. Class-by-Class Collection Guidelines

### Class 0: `SANITARY_VISIBLE`
- **What to photograph:**
  - Segregated sanitary/hygiene pouches (red dot / marked pouches)
  - Visible wrapped sanitary napkins, diapers, hygiene cotton, bandages, disposable gloves
  - Loose or in open pouches/bags placed for pickup
- **Variations needed:**
  - Different pouch colors (paper pouch, eco-friendly wrap, red-marked bag)
  - Indoor floor vs doorstep vs collection cart background
  - Natural daylight vs indoor LED vs low-light morning pickup
  - Close-up (< 50 cm) and mid-range (1 m) angles
- **DO NOT photograph:**
  - Clinical hospital waste or graphic medical imagery
  - Sealed opaque black bags with zero visible sanitary markings/pouch shape

---

### Class 1: `SPECIAL_CARE_VISIBLE`
- **What to photograph:**
  - Used household batteries (AA, AAA, button cells, phone batteries)
  - Pharmaceutical blister packs, medicine bottles, expired pill strips
  - Small e-waste (cables, broken chargers, circuit boards, light bulbs)
  - Broken glass in protective wrap, razor blades in container
- **Variations needed:**
  - Single battery/strip vs cluster of items
  - In transparent pouch vs lying on collection surface
  - Angle variations (top-down, 45° angle)

---

### Class 2: `GENERAL_WASTE_VISIBLE`
- **What to photograph:**
  - Mixed household dry waste (biscuit wrappers, plastic packaging, cartons)
  - Organic kitchen waste in bin/bag
  - General unsegregated trash bag placed for collection
- **Variations needed:**
  - Different bag types (blue, green, transparent, white bags)
  - Street bin, collection bin, doorstep presentations

---

### Class 3: `EMPTY_OR_UNCLEAR`
- **What to photograph:**
  - Out-of-focus / blurry photo of collection area
  - Photo taken while moving phone (motion blur)
  - Photo of an empty doorstep or empty collection cart
  - Extremely dark / underexposed pickup area
  - Partially cropped bag showing only an ambiguous corner

---

### Class 4: `NON_WASTE_OR_INVALID_CAPTURE`
- **What to photograph:**
  - Accidental wall, sky, or ceiling capture
  - Photo of a shoe, floor tile, door handle, phone screen
  - Photo focusing purely on a QR code sticker on a wall (no waste)
  - Face or person standing in front of camera (verify EXIF/privacy)

---

## 3. Privacy & Quality Protocol

> [!IMPORTANT]
> 1. **Zero Faces:** Do NOT include human faces in any photo.
> 2. **Zero PII:** Ensure prescription medicine labels, delivery labels with names/addresses, or ID cards are covered or excluded.
> 3. **EXIF Stripping:** Run `python ai/training/strip_exif.py ai/training/dataset/` before committing new images.
> 4. **Format:** Standard JPEG or PNG from phone camera ($\ge 640 \times 480$ px).

---

## 4. Workflow After Data Collection

1. Copy photos into target subdirectories:
   - `ai/training/dataset/SANITARY_VISIBLE/`
   - `ai/training/dataset/SPECIAL_CARE_VISIBLE/`
   - `ai/training/dataset/GENERAL_WASTE_VISIBLE/`
   - `ai/training/dataset/EMPTY_OR_UNCLEAR/`
   - `ai/training/dataset/NON_WASTE_OR_INVALID_CAPTURE/`
2. Run audit & EXIF cleanup:
   ```bash
   python ai/training/strip_exif.py ai/training/dataset/
   python ai/training/audit_dataset.py
   ```
3. Execute training pipeline:
   ```bash
   python ai/training/train.py --dataset ai/training/dataset --epochs 30 --seed 42
   python ai/training/export_tflite.py
   python ai/training/validate.py --model android/app/src/main/assets/nirmaltag_waste_classifier_v1.tflite --labels android/app/src/main/assets/labels.txt --dataset ai/training/dataset
   ```
4. Build release APK:
   ```bash
   cd android && .\gradlew.bat assembleRelease
   ```
5. Install on physical OPPO A15s and test live inference!
