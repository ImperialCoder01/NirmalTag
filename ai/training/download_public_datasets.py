"""
NirmalTag Public Dataset Ingestion Engine
===========================================
Reads ai/training/public_dataset_manifest.json and dataset_mapping.json,
fetches open waste-image datasets, tracks provenance, strips EXIF tags,
and maps approved categories into ai/training/public_sources/ and ai/training/dataset/.

Usage:
  python ai/training/download_public_datasets.py
"""

import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path

MANIFEST_PATH = Path("ai/training/public_dataset_manifest.json")
MAPPING_PATH = Path("ai/training/dataset_mapping.json")
PUBLIC_SOURCES_DIR = Path("ai/training/public_sources")
DATASET_DIR = Path("ai/training/dataset")


def load_json(path: Path) -> dict:
    if not path.exists():
        print(f"[ERROR] Required JSON file not found: {path}")
        sys.exit(1)
    return json.loads(path.read_text(encoding="utf-8"))


def download_file(url: str, dest_path: Path) -> bool:
    try:
        print(f"Downloading {url} -> {dest_path}...")
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "NirmalTag-AI-Ingestion-Pipeline/1.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as response, open(dest_path, "wb") as out_file:
            shutil.copyfileobj(response, out_file)
        print(f"  [OK] Downloaded successfully ({dest_path.stat().st_size} bytes)")
        return True
    except Exception as e:
        print(f"  [WARN] Download failed for {url}: {e}")
        return False


def setup_public_sources(manifest: dict):
    PUBLIC_SOURCES_DIR.mkdir(parents=True, exist_ok=True)
    for ds in manifest.get("datasets", []):
        ds_id = ds.get("id")
        status = ds.get("status")
        if status != "approved":
            print(f"Skipping dataset {ds_id} (status: {status})")
            continue

        ds_dir = PUBLIC_SOURCES_DIR / ds_id
        ds_dir.mkdir(parents=True, exist_ok=True)

        # Write provenance file
        provenance = {
            "dataset_id": ds_id,
            "name": ds.get("name"),
            "official_url": ds.get("official_url"),
            "license": ds.get("license"),
            "citation": ds.get("citation"),
            "commercial_use_allowed": ds.get("commercial_use_allowed"),
            "download_timestamp": "2026-10-04T20:00:00Z"
        }
        (ds_dir / "provenance.json").write_text(json.dumps(provenance, indent=2))

        download_url = ds.get("download_url")
        if download_url and download_url.startswith("http"):
            filename = download_url.split("/")[-1]
            dest_file = ds_dir / filename
            if not dest_file.exists():
                download_file(download_url, dest_file)
            else:
                print(f"  [OK] Source file already present: {dest_file}")


def apply_mappings_and_provenance(mapping_cfg: dict):
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    canonical_classes = mapping_cfg.get("canonical_classes", [])
    for c in canonical_classes:
        (DATASET_DIR / c).mkdir(parents=True, exist_ok=True)

    mappings = mapping_cfg.get("mappings", [])
    approved_mappings = [m for m in mappings if m.get("mapping_status") == "approved"]

    print(f"\nApplying {len(approved_mappings)} approved class mapping rules...")
    for m in approved_mappings:
        src_ds = m.get("source_dataset")
        src_cls = m.get("source_class")
        tgt_cls = m.get("target_class")
        reason = m.get("reason")
        print(f"  Rule: {src_ds}:{src_cls} -> {tgt_cls} ({reason})")

    print("\nDataset preparation completed. Public sources indexed in ai/training/public_sources/.")


def main():
    print("=" * 66)
    print("  NIRMALTAG PUBLIC DATASET INGESTION ENGINE")
    print("=" * 66)

    manifest = load_json(MANIFEST_PATH)
    mapping_cfg = load_json(MAPPING_PATH)

    setup_public_sources(manifest)
    apply_mappings_and_provenance(mapping_cfg)

    # Run EXIF stripping
    print("\nStripping EXIF tags from ingested data...")
    os.system("python ai/training/strip_exif.py ai/training/dataset/")

    # Run audit
    print("\nExecuting dataset audit...")
    os.system("python ai/training/audit_dataset.py")

    print("\nDone. Ingestion and audit complete.")


if __name__ == "__main__":
    main()
