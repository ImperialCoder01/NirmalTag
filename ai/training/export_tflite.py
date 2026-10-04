"""
NirmalTag Waste Classifier — TFLite Export Script
====================================================
Use this script AFTER training completes (best_model.pt exists) to:
  1. Export PyTorch checkpoint → ONNX
  2. Convert ONNX → TFLite (INT8 quantized)
  3. Copy to Android assets
  4. Write SHA-256 manifest

Requirements:
  pip install torch torchvision onnx tensorflow onnx-tf

Usage:
  python ai/training/export_tflite.py --checkpoint ai/training/output/best_model.pt
"""

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

CLASSES = [
    "SANITARY_VISIBLE",
    "SPECIAL_CARE_VISIBLE",
    "GENERAL_WASTE_VISIBLE",
    "EMPTY_OR_UNCLEAR",
    "NON_WASTE_OR_INVALID_CAPTURE",
]
INPUT_SIZE         = 224
MODEL_VERSION      = "nirmaltag-v1"
TFLITE_ASSET_NAME  = "nirmaltag_waste_classifier_v1.tflite"
LABELS_ASSET_NAME  = "labels.txt"


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_model(ckpt_path: Path, device) -> nn.Module:
    model = mobilenet_v3_small(weights=None)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, len(CLASSES))
    model.load_state_dict(torch.load(ckpt_path, map_location=device))
    model.eval()
    return model


def export_onnx(model, onnx_path: Path):
    dummy = torch.randn(1, 3, INPUT_SIZE, INPUT_SIZE)
    torch.onnx.export(
        model, dummy, str(onnx_path),
        input_names=["input"], output_names=["output"],
        opset_version=11,
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    )
    print(f"  ONNX exported → {onnx_path}  ({onnx_path.stat().st_size // 1024} KB)")


def convert_to_tflite(onnx_path: Path, tflite_path: Path):
    try:
        import tensorflow as tf
        import onnx
        from onnx_tf.backend import prepare

        print("  ONNX → TF SavedModel …")
        onnx_model = onnx.load(str(onnx_path))
        tf_rep = prepare(onnx_model)
        saved_dir = tflite_path.parent / "_tf_tmp"
        tf_rep.export_graph(str(saved_dir))

        print("  TF SavedModel → TFLite INT8 …")
        converter = tf.lite.TFLiteConverter.from_saved_model(str(saved_dir))
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        tflite_bytes = converter.convert()
        tflite_path.write_bytes(tflite_bytes)
        print(f"  TFLite written → {tflite_path}  ({len(tflite_bytes) // 1024} KB)")
        return True
    except ImportError as e:
        print(f"  [ERROR] Missing dependency: {e}")
        print("  Install: pip install tensorflow onnx-tf")
        return False


def install_to_android(tflite_path: Path, output_dir: Path):
    android_assets = Path("android/app/src/main/assets")
    android_assets.mkdir(parents=True, exist_ok=True)

    dest_tflite = android_assets / TFLITE_ASSET_NAME
    shutil.copy2(tflite_path, dest_tflite)
    model_hash = sha256_of_file(dest_tflite)

    labels_src = output_dir / LABELS_ASSET_NAME
    if not labels_src.exists():
        labels_src.write_text("\n".join(CLASSES))
    shutil.copy2(labels_src, android_assets / LABELS_ASSET_NAME)

    manifest = {
        "model_file": TFLITE_ASSET_NAME,
        "labels_file": LABELS_ASSET_NAME,
        "model_version": MODEL_VERSION,
        "sha256": model_hash,
        "input_size": INPUT_SIZE,
        "classes": CLASSES,
        "confidence_threshold": 0.80,
    }
    (android_assets / "model_manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\n  ✓ Installed: {dest_tflite}")
    print(f"    SHA-256  : {model_hash}")
    print(f"  ✓ Labels  : {android_assets / LABELS_ASSET_NAME}")
    print(f"  ✓ Manifest: {android_assets / 'model_manifest.json'}")
    return model_hash


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, default="ai/training/output/best_model.pt")
    parser.add_argument("--output", type=str, default="ai/training/output")
    args = parser.parse_args()

    ckpt = Path(args.checkpoint)
    if not ckpt.exists():
        print(f"[ERROR] Checkpoint not found: {ckpt}")
        print("Run ai/training/train.py first.")
        sys.exit(1)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cpu")
    print(f"Loading checkpoint: {ckpt}")
    model = load_model(ckpt, device)

    onnx_path   = output_dir / "nirmaltag_waste_classifier_v1.onnx"
    tflite_path = output_dir / TFLITE_ASSET_NAME

    export_onnx(model, onnx_path)
    ok = convert_to_tflite(onnx_path, tflite_path)
    if ok:
        install_to_android(tflite_path, output_dir)
        print("\n  EXPORT COMPLETE — Android asset ready.")
    else:
        print("\n  EXPORT INCOMPLETE — TFLite conversion failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
