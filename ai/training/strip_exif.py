"""
NirmalTag — EXIF Stripping Utility
====================================
Removes all EXIF metadata (GPS coordinates, device info, timestamps)
from all images in the dataset before committing to the repository.

Usage:
  pip install piexif Pillow
  python ai/training/strip_exif.py ai/training/dataset/

This is REQUIRED before adding real-world photos to the dataset.
"""

import sys
from pathlib import Path
from PIL import Image

def strip_exif(image_path: Path) -> bool:
    try:
        img = Image.open(image_path)
        if img.format not in ("JPEG", "PNG", "WEBP"):
            return False
        data = list(img.getdata())
        clean = Image.new(img.mode, img.size)
        clean.putdata(data)
        clean.save(image_path, format=img.format, quality=95 if img.format == "JPEG" else None)
        return True
    except Exception as e:
        print(f"  [WARN] Could not process {image_path.name}: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python strip_exif.py <dataset_directory>")
        sys.exit(1)

    dataset_root = Path(sys.argv[1])
    if not dataset_root.exists():
        print(f"[ERROR] Directory not found: {dataset_root}")
        sys.exit(1)

    supported = {".jpg", ".jpeg", ".png", ".webp"}
    images = [p for p in dataset_root.rglob("*") if p.is_file() and p.suffix.lower() in supported]

    print(f"Stripping EXIF from {len(images)} images in {dataset_root}…")
    success = sum(1 for img in images if strip_exif(img))
    print(f"Done. {success}/{len(images)} images cleaned.")


if __name__ == "__main__":
    main()
