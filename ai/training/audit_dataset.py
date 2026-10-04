"""
NirmalTag Dataset Ingestion & Quality Audit Tool
================================================
Scans ai/training/dataset/, checks image integrity, resolution,
duplicates (SHA-256), EXIF metadata, and class distribution.

If corrupt, unreadable, sub-224x224, or duplicate images are found,
it flags them (or quarantines them if --quarantine is specified).

Generates docs/AI_DATASET_AUDIT.md reporting complete dataset health.

Usage:
  python ai/training/audit_dataset.py
  python ai/training/audit_dataset.py --quarantine
"""

import argparse
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path
from PIL import Image

CLASSES = [
    "SANITARY_VISIBLE",
    "SPECIAL_CARE_VISIBLE",
    "GENERAL_WASTE_VISIBLE",
    "EMPTY_OR_UNCLEAR",
    "NON_WASTE_OR_INVALID_CAPTURE",
]

MIN_RESOLUTION = (224, 224)
RECOMMENDED_RESOLUTION = (640, 480)
MIN_IMAGES_PER_CLASS = 50
SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def get_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def check_exif_metadata(img: Image.Image) -> bool:
    """Returns True if image contains EXIF metadata."""
    try:
        exif = img.getexif()
        return bool(exif and len(exif) > 0)
    except Exception:
        return False


def audit_image(path: Path) -> dict:
    """Audit single image file for resolution, integrity, EXIF, format."""
    result = {
        "path": str(path),
        "filename": path.name,
        "valid": True,
        "issues": [],
        "width": 0,
        "height": 0,
        "has_exif": False,
        "format": None,
        "mode": None,
        "sha256": None,
    }

    if path.suffix.lower() not in SUPPORTED_EXTS:
        result["valid"] = False
        result["issues"].append(f"Unsupported format: {path.suffix}")
        return result

    try:
        result["sha256"] = get_sha256(path)
        with Image.open(path) as img:
            result["width"], result["height"] = img.size
            result["format"] = img.format
            result["mode"] = img.mode
            result["has_exif"] = check_exif_metadata(img)

            if result["width"] < MIN_RESOLUTION[0] or result["height"] < MIN_RESOLUTION[1]:
                result["valid"] = False
                result["issues"].append(
                    f"Resolution too small: {result['width']}x{result['height']} (min {MIN_RESOLUTION[0]}x{MIN_RESOLUTION[1]})"
                )

            if result["has_exif"]:
                result["issues"].append("Contains EXIF metadata (privacy risk - run strip_exif.py)")

    except Exception as e:
        result["valid"] = False
        result["issues"].append(f"Corrupted or unreadable: {str(e)}")

    return result


def audit_dataset(dataset_root: Path, quarantine_flag: bool = False) -> dict:
    quarantine_dir = dataset_root.parent / "quarantine"
    if quarantine_flag:
        quarantine_dir.mkdir(parents=True, exist_ok=True)

    seen_hashes = {}
    class_counts = {cls: 0 for cls in CLASSES}
    valid_counts = {cls: 0 for cls in CLASSES}
    class_audits = {cls: [] for cls in CLASSES}
    quarantined_files = []

    for cls in CLASSES:
        cls_dir = dataset_root / cls
        if not cls_dir.exists():
            continue

        for p in cls_dir.rglob("*"):
            if not p.is_file() or p.name == ".gitkeep":
                continue

            class_counts[cls] += 1
            info = audit_image(p)

            # Check duplicate
            if info["sha256"]:
                if info["sha256"] in seen_hashes:
                    info["valid"] = False
                    info["issues"].append(f"Duplicate of {seen_hashes[info['sha256']]}")
                else:
                    seen_hashes[info["sha256"]] = str(p)

            if info["valid"]:
                valid_counts[cls] += 1
            else:
                if quarantine_flag:
                    target_q = quarantine_dir / cls
                    target_q.mkdir(parents=True, exist_ok=True)
                    dest = target_q / p.name
                    shutil.move(str(p), str(dest))
                    quarantined_files.append((str(p), str(dest), info["issues"]))

            class_audits[cls].append(info)

    total_images = sum(class_counts.values())
    total_valid = sum(valid_counts.values())

    report_data = {
        "total_images": total_images,
        "total_valid": total_valid,
        "unique_hashes": len(seen_hashes),
        "class_counts": class_counts,
        "valid_counts": valid_counts,
        "quarantined_count": len(quarantined_files),
        "class_audits": class_audits,
        "is_ready_for_training": all(v >= MIN_IMAGES_PER_CLASS for v in valid_counts.values()),
    }

    return report_data


def generate_markdown_report(report: dict, doc_path: Path):
    lines = [
        "# NIRMALTAG — AI DATASET AUDIT REPORT",
        "",
        "**Timestamp:** 2026-10-04  ",
        "**Dataset Root:** `ai/training/dataset/`  ",
        f"**Training Readiness:** {'READY FOR TRAINING' if report['is_ready_for_training'] else 'DATASET COLLECTION REQUIRED'}  ",
        "",
        "---",
        "",
        "## 1. DATASET INVENTORY SUMMARY",
        "",
        f"- **Total Files Found:** {report['total_images']}",
        f"- **Total Valid Images:** {report['total_valid']}",
        f"- **Unique SHA-256 Hashes:** {report['unique_hashes']}",
        f"- **Quarantined Files:** {report['quarantined_count']}",
        "",
        "| Class Name | Total Files | Valid Images | Status (Min: 50) |",
        "| :--- | :---: | :---: | :--- |",
    ]

    for cls in CLASSES:
        cnt = report["valid_counts"][cls]
        status = "READY" if cnt >= MIN_IMAGES_PER_CLASS else f"INSUFFICIENT (Missing {MIN_IMAGES_PER_CLASS - cnt})"
        lines.append(f"| `{cls}` | {report['class_counts'][cls]} | {cnt} | {status} |")

    lines.extend([
        "",
        "---",
        "",
        "## 2. QUALITY & PRIVACY VERIFICATION",
        "",
        "- **Resolution Requirement:** Minimum 224x224 px (Recommended 640x480 px).",
        "- **Format Verification:** Accepted JPEG, PNG, WebP, BMP.",
        "- **EXIF Privacy Guard:** EXIF metadata must be stripped prior to model training.",
        "- **Duplicate Detection:** SHA-256 hash collision analysis active.",
        "",
        "---",
        "",
        "## 3. AUDIT CONCLUSION & NEXT STEPS",
        "",
    ])

    if report["is_ready_for_training"]:
        lines.append("All classes meet the minimum threshold of 50 images. You may proceed to run `python ai/training/train.py`.")
    else:
        lines.extend([
            "**DATASET STATUS: INSUFFICIENT DATA FOR TRAINING**",
            "",
            "Training requires a minimum of 50 valid domain-specific images per class (250 total minimum).",
            "Refer to `docs/AI_DATASET_SPECIFICATION.md` for image collection and labelling guidelines.",
            "",
            "To maintain model truthfulness, the system remains in **`MODEL_UNAVAILABLE`** state.",
        ])

    doc_path.write_text("\n".join(lines))
    print(f"Dataset audit report generated: {doc_path}")


def main():
    parser = argparse.ArgumentParser(description="NirmalTag AI Dataset Audit")
    parser.add_argument("--dataset", type=str, default="ai/training/dataset")
    parser.add_argument("--doc", type=str, default="docs/AI_DATASET_AUDIT.md")
    parser.add_argument("--quarantine", action="store_true", help="Move invalid/corrupted files to ai/training/quarantine/")
    args = parser.parse_args()

    dataset_root = Path(args.dataset)
    doc_path = Path(args.doc)

    if not dataset_root.exists():
        print(f"Dataset directory '{dataset_root}' does not exist.")
        sys.exit(1)

    print(f"Auditing dataset in {dataset_root}...")
    report = audit_dataset(dataset_root, args.quarantine)
    generate_markdown_report(report, doc_path)

    print("\nAudit Summary:")
    print(f"  Total Valid Images : {report['total_valid']} / {report['total_images']}")
    print(f"  Training Ready     : {report['is_ready_for_training']}")


if __name__ == "__main__":
    main()
