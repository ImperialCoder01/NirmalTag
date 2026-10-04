"""
NirmalTag On-Device Waste Visual Classifier — Training Pipeline
================================================================
Architecture : MobileNetV3-Small (pretrained ImageNet, fine-tuned)
Export       : TensorFlow Lite INT8 quantized (.tflite)
Output asset : nirmaltag_waste_classifier_v1.tflite

Classes (must match labels.txt order, 0-indexed):
  0  SANITARY_VISIBLE
  1  SPECIAL_CARE_VISIBLE
  2  GENERAL_WASTE_VISIBLE
  3  EMPTY_OR_UNCLEAR
  4  NON_WASTE_OR_INVALID_CAPTURE

Run:
  pip install torch torchvision onnx onnxruntime Pillow tqdm scikit-learn
  # NOTE: tensorflow is required for TFLite export; OR use onnx -> tflite converter
  # pip install tensorflow  (for TFLite conversion)
  python ai/training/train.py --dataset ai/training/dataset --epochs 30 --seed 42

Usage with GPU:
  python ai/training/train.py --dataset ai/training/dataset --epochs 50 --device cuda

STOP CONDITION:
  If the dataset/CLASS directory has fewer than MIN_IMAGES_PER_CLASS images,
  training will abort and report: TRAINING BLOCKED — INSUFFICIENT DATA.
"""

import argparse
import hashlib
import json
import os
import random
import shutil
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from tqdm import tqdm

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
import torchvision.transforms as T
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

# ─── Constants ────────────────────────────────────────────────────────────────
MODEL_VERSION         = "nirmaltag-v1"
TFLITE_ASSET_NAME     = "nirmaltag_waste_classifier_v1.tflite"
LABELS_ASSET_NAME     = "labels.txt"
INPUT_SIZE            = 224        # MobileNetV3-Small native input
CONFIDENCE_THRESHOLD  = 0.80       # Production threshold
MIN_IMAGES_PER_CLASS  = 50         # Absolute minimum per class to start training
TARGET_ACCURACY       = 0.85       # Acceptance gate: overall test accuracy ≥ 85%
TARGET_MACRO_F1       = 0.80       # Acceptance gate: macro F1 ≥ 0.80
TARGET_MIN_RECALL     = 0.75       # No critical class recall below 75%

CLASSES = [
    "SANITARY_VISIBLE",
    "SPECIAL_CARE_VISIBLE",
    "GENERAL_WASTE_VISIBLE",
    "EMPTY_OR_UNCLEAR",
    "NON_WASTE_OR_INVALID_CAPTURE",
]

# ─── Dataset ──────────────────────────────────────────────────────────────────

def collect_image_paths(dataset_root: Path) -> dict[str, list[Path]]:
    """Recursively collect image paths per class. Returns dict class -> [paths]."""
    supported_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    result: dict[str, list[Path]] = {}
    for cls in CLASSES:
        cls_dir = dataset_root / cls
        if not cls_dir.exists():
            result[cls] = []
            continue
        paths = [
            p for p in cls_dir.rglob("*")
            if p.is_file() and p.suffix.lower() in supported_exts
        ]
        result[cls] = paths
    return result


def check_dataset_minimum(image_map: dict[str, list[Path]]) -> bool:
    """Returns True if all classes meet the minimum image requirement."""
    print("\n-- Dataset Inventory --------------------------------------------------")
    all_ok = True
    for cls in CLASSES:
        count = len(image_map.get(cls, []))
        status = "OK" if count >= MIN_IMAGES_PER_CLASS else "INSUFFICIENT"
        print(f"  {status:12s}  {cls}: {count} images (min: {MIN_IMAGES_PER_CLASS})")
        if count < MIN_IMAGES_PER_CLASS:
            all_ok = False
    print("----------------------------------------------------------------------")
    return all_ok


class WasteDataset(Dataset):
    """Torch Dataset for NirmalTag waste images."""

    def __init__(self, items: list[tuple[Path, int]], transform=None):
        self.items = items
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        path, label = self.items[idx]
        try:
            img = Image.open(path).convert("RGB")
        except Exception as e:
            # Return a black image on corrupt file rather than crashing
            img = Image.new("RGB", (INPUT_SIZE, INPUT_SIZE), (0, 0, 0))
        if self.transform:
            img = self.transform(img)
        return img, label


def build_transforms(is_train: bool):
    if is_train:
        return T.Compose([
            T.RandomResizedCrop(INPUT_SIZE, scale=(0.7, 1.0)),
            T.RandomHorizontalFlip(),
            T.RandomRotation(15),
            T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
            T.RandomPerspective(distortion_scale=0.2, p=0.3),
            T.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    else:
        return T.Compose([
            T.Resize(256),
            T.CenterCrop(INPUT_SIZE),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])


def split_dataset(
    image_map: dict[str, list[Path]],
    seed: int,
    train_ratio=0.70,
    val_ratio=0.15,
) -> tuple[list, list, list]:
    """Split images per-class to avoid data leakage, then combine.
    Returns (train_items, val_items, test_items) where each item = (Path, class_idx).
    """
    train_items, val_items, test_items = [], [], []
    for cls_idx, cls in enumerate(CLASSES):
        paths = image_map.get(cls, [])
        if not paths:
            continue
        random.seed(seed)
        random.shuffle(paths)
        n = len(paths)
        n_train = int(n * train_ratio)
        n_val   = int(n * val_ratio)
        train_paths = paths[:n_train]
        val_paths   = paths[n_train:n_train + n_val]
        test_paths  = paths[n_train + n_val:]
        train_items.extend([(p, cls_idx) for p in train_paths])
        val_items.extend([(p, cls_idx)   for p in val_paths])
        test_items.extend([(p, cls_idx)  for p in test_paths])
    return train_items, val_items, test_items


def compute_class_weights(train_items: list) -> torch.Tensor:
    """Inverse-frequency class weights to handle imbalance."""
    counts = [0] * len(CLASSES)
    for _, label in train_items:
        counts[label] += 1
    total = sum(counts)
    weights = [total / (len(CLASSES) * (c if c > 0 else 1)) for c in counts]
    return torch.tensor(weights, dtype=torch.float32)


# ─── Training ─────────────────────────────────────────────────────────────────

def train_epoch(model, loader, criterion, optimizer, device) -> tuple[float, float]:
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for images, labels in tqdm(loader, desc="  train", leave=False):
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * images.size(0)
        correct += (outputs.argmax(dim=1) == labels).sum().item()
        total += images.size(0)
    return total_loss / total, correct / total


def eval_epoch(model, loader, criterion, device) -> tuple[float, float, list, list]:
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    all_preds, all_labels = [], []
    with torch.no_grad():
        for images, labels in tqdm(loader, desc="  eval ", leave=False):
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            total_loss += loss.item() * images.size(0)
            preds = outputs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += images.size(0)
            all_preds.extend(preds.cpu().tolist())
            all_labels.extend(labels.cpu().tolist())
    return total_loss / total, correct / total, all_preds, all_labels


# ─── Export ───────────────────────────────────────────────────────────────────

def export_onnx(model, output_path: Path):
    """Export trained PyTorch model to ONNX."""
    model.eval()
    dummy_input = torch.randn(1, 3, INPUT_SIZE, INPUT_SIZE)
    torch.onnx.export(
        model,
        dummy_input,
        str(output_path),
        input_names=["input"],
        output_names=["output"],
        opset_version=11,
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
    )
    print(f"  ONNX model exported: {output_path} ({output_path.stat().st_size // 1024} KB)")


def convert_onnx_to_tflite(onnx_path: Path, tflite_path: Path, representative_dataset=None):
    """
    Convert ONNX → TensorFlow Lite (INT8 quantized).
    Requires: tensorflow, onnx, onnx-tf
    If onnx-tf is unavailable, falls back to float32 TFLite via alternative path.
    """
    try:
        import tensorflow as tf
        import onnx
        from onnx_tf.backend import prepare

        print("  Converting ONNX → TF SavedModel …")
        onnx_model = onnx.load(str(onnx_path))
        tf_rep = prepare(onnx_model)
        saved_model_dir = tflite_path.parent / "tf_savedmodel"
        tf_rep.export_graph(str(saved_model_dir))

        print("  Converting TF SavedModel → TFLite INT8 …")
        converter = tf.lite.TFLiteConverter.from_saved_model(str(saved_model_dir))
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        if representative_dataset is not None:
            converter.representative_dataset = representative_dataset
            converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
            converter.inference_input_type  = tf.uint8
            converter.inference_output_type = tf.uint8
        tflite_model = converter.convert()
        tflite_path.write_bytes(tflite_model)
        print(f"  TFLite INT8 model written: {tflite_path} ({len(tflite_model) // 1024} KB)")
        return True

    except ImportError as e:
        print(f"  [WARN] Full ONNX→TFLite conversion unavailable: {e}")
        print("         Install: pip install tensorflow onnx-tf")
        print("         Falling back: saving PyTorch checkpoint only.")
        return False


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ─── Evaluation Report ────────────────────────────────────────────────────────

def evaluate_and_report(
    model, test_loader, device, output_dir: Path
) -> dict:
    """Run full evaluation and write report JSON."""
    _, _, preds, labels = eval_epoch(model, test_loader, nn.CrossEntropyLoss(), device)

    acc = accuracy_score(labels, preds)
    macro_f1 = f1_score(labels, preds, average="macro", zero_division=0)
    prec, rec, f1_per, _ = precision_recall_fscore_support(
        labels, preds, labels=list(range(len(CLASSES))), zero_division=0
    )
    cm = confusion_matrix(labels, preds, labels=list(range(len(CLASSES))))

    report = {
        "model_version"        : MODEL_VERSION,
        "overall_accuracy"     : round(float(acc), 4),
        "macro_f1"             : round(float(macro_f1), 4),
        "confidence_threshold" : CONFIDENCE_THRESHOLD,
        "classes"              : CLASSES,
        "per_class_metrics"    : {
            cls: {
                "precision": round(float(prec[i]), 4),
                "recall"   : round(float(rec[i]), 4),
                "f1"       : round(float(f1_per[i]), 4),
            }
            for i, cls in enumerate(CLASSES)
        },
        "confusion_matrix"     : cm.tolist(),
        "acceptance_gates"     : {
            "overall_accuracy_target" : TARGET_ACCURACY,
            "macro_f1_target"         : TARGET_MACRO_F1,
            "min_recall_target"       : TARGET_MIN_RECALL,
            "overall_accuracy_pass"   : bool(acc >= TARGET_ACCURACY),
            "macro_f1_pass"           : bool(macro_f1 >= TARGET_MACRO_F1),
            "all_class_recall_pass"   : bool(all(r >= TARGET_MIN_RECALL for r in rec)),
        },
    }

    print("\n── Evaluation Results ──────────────────────────────────────────")
    print(f"  Overall accuracy : {acc:.4f}  (target ≥ {TARGET_ACCURACY})")
    print(f"  Macro F1         : {macro_f1:.4f}  (target ≥ {TARGET_MACRO_F1})")
    print("\n  Per-class metrics:")
    for i, cls in enumerate(CLASSES):
        print(f"    {cls:30s}  P={prec[i]:.3f}  R={rec[i]:.3f}  F1={f1_per[i]:.3f}")
    print("\n  Confusion matrix (rows=true, cols=pred):")
    for row in cm:
        print("    " + "  ".join(f"{v:4d}" for v in row))

    gates = report["acceptance_gates"]
    print("\n  Acceptance gates:")
    print(f"    Accuracy ≥ {TARGET_ACCURACY}  : {'PASS' if gates['overall_accuracy_pass'] else 'FAIL'}")
    print(f"    Macro F1 ≥ {TARGET_MACRO_F1}  : {'PASS' if gates['macro_f1_pass'] else 'FAIL'}")
    print(f"    All recall ≥ {TARGET_MIN_RECALL}: {'PASS' if gates['all_class_recall_pass'] else 'FAIL'}")

    all_pass = all([
        gates["overall_accuracy_pass"],
        gates["macro_f1_pass"],
        gates["all_class_recall_pass"],
    ])
    print(f"\n  ──────────────────────────────────────────────────────────────")
    print(f"  FINAL VERDICT: {'PRODUCTION READY' if all_pass else 'RESEARCH/DEMO ONLY — NOT PRODUCTION READY'}")

    report_path = output_dir / "evaluation_report.json"
    report_path.write_text(json.dumps(report, indent=2))
    print(f"\n  Evaluation report saved: {report_path}")
    return report


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="NirmalTag Waste Classifier Training")
    parser.add_argument("--dataset", type=str, default="ai/training/dataset",
                        help="Root directory containing class subdirectories")
    parser.add_argument("--output", type=str, default="ai/training/output",
                        help="Output directory for models and reports")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility")
    parser.add_argument("--device", type=str, default="cpu",
                        help="Training device: cpu or cuda")
    args = parser.parse_args()

    # ── Reproducibility ──────────────────────────────────────────────────────
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if torch.cuda.is_available() and args.device == "cuda":
        torch.cuda.manual_seed_all(args.seed)

    dataset_root = Path(args.dataset)
    output_dir   = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 66)
    print("  NIRMALTAG WASTE VISUAL CLASSIFIER — TRAINING PIPELINE")
    print(f"  Model version  : {MODEL_VERSION}")
    print(f"  Architecture   : MobileNetV3-Small (INT8 quantized TFLite)")
    print(f"  Classes        : {len(CLASSES)}")
    print(f"  Input size     : {INPUT_SIZE}×{INPUT_SIZE}×3")
    print(f"  Seed           : {args.seed}")
    print(f"  Device         : {args.device}")
    print(f"  Epochs         : {args.epochs}")
    print(f"  Batch size     : {args.batch_size}")
    print(f"  Learning rate  : {args.lr}")
    print("=" * 66)

    # ── Dataset Check ────────────────────────────────────────────────────────
    image_map = collect_image_paths(dataset_root)
    if not check_dataset_minimum(image_map):
        print("\n" + "!" * 66)
        print("  TRAINING BLOCKED — INSUFFICIENT DOMAIN-SPECIFIC DATA")
        print("  All five classes require ≥ 50 labelled images each.")
        print("  See docs/AI_DATASET_SPECIFICATION.md for collection guide.")
        print("!" * 66)
        sys.exit(2)

    # ── Split ────────────────────────────────────────────────────────────────
    train_items, val_items, test_items = split_dataset(image_map, args.seed)
    print(f"\n  Split: train={len(train_items)}  val={len(val_items)}  test={len(test_items)}")

    # ── Dataloaders ──────────────────────────────────────────────────────────
    train_ds = WasteDataset(train_items, build_transforms(True))
    val_ds   = WasteDataset(val_items,   build_transforms(False))
    test_ds  = WasteDataset(test_items,  build_transforms(False))

    class_weights = compute_class_weights(train_items)
    sample_weights = [class_weights[label].item() for _, label in train_items]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(train_items), replacement=True)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, sampler=sampler, num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch_size, shuffle=False,  num_workers=0)
    test_loader  = DataLoader(test_ds,  batch_size=args.batch_size, shuffle=False,  num_workers=0)

    # ── Model ────────────────────────────────────────────────────────────────
    device = torch.device(args.device if torch.cuda.is_available() or args.device == "cpu" else "cpu")
    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    # Replace classifier head for our 5 classes
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, len(CLASSES))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    # ── Training Loop ────────────────────────────────────────────────────────
    best_val_f1 = 0.0
    best_ckpt_path = output_dir / "best_model.pt"
    history = []

    print("\n── Training ────────────────────────────────────────────────────")
    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, val_preds, val_labels = eval_epoch(model, val_loader, criterion, device)
        val_f1 = f1_score(val_labels, val_preds, average="macro", zero_division=0)
        scheduler.step()

        print(f"  Epoch {epoch:3d}/{args.epochs}  "
              f"train_loss={train_loss:.4f} train_acc={train_acc:.4f}  "
              f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}  val_macro_f1={val_f1:.4f}")

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            torch.save(model.state_dict(), best_ckpt_path)

        history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4), "train_acc": round(train_acc, 4),
            "val_loss": round(val_loss, 4), "val_acc": round(val_acc, 4), "val_f1": round(val_f1, 4),
        })

    # ── Reload Best Checkpoint ───────────────────────────────────────────────
    model.load_state_dict(torch.load(best_ckpt_path, map_location=device))
    print(f"\n  Best checkpoint restored (val macro F1 = {best_val_f1:.4f})")

    # ── Full Evaluation ──────────────────────────────────────────────────────
    eval_report = evaluate_and_report(model, test_loader, device, output_dir)

    # ── Export ONNX ──────────────────────────────────────────────────────────
    onnx_path = output_dir / "nirmaltag_waste_classifier_v1.onnx"
    export_onnx(model, onnx_path)

    # ── Convert to TFLite ────────────────────────────────────────────────────
    tflite_path = output_dir / TFLITE_ASSET_NAME
    tflite_ok = convert_onnx_to_tflite(onnx_path, tflite_path)

    # ── Write labels.txt ─────────────────────────────────────────────────────
    labels_path = output_dir / LABELS_ASSET_NAME
    labels_path.write_text("\n".join(CLASSES))
    print(f"  Labels written: {labels_path}")

    # ── Copy to Android assets ───────────────────────────────────────────────
    android_assets = Path("android/app/src/main/assets")
    android_assets.mkdir(parents=True, exist_ok=True)

    if tflite_ok and tflite_path.exists():
        dest_tflite = android_assets / TFLITE_ASSET_NAME
        shutil.copy2(tflite_path, dest_tflite)
        model_hash = sha256_of_file(dest_tflite)
        print(f"\n  ✓ TFLite model installed: {dest_tflite}")
        print(f"    SHA-256: {model_hash}")

        dest_labels = android_assets / LABELS_ASSET_NAME
        shutil.copy2(labels_path, dest_labels)
        print(f"  ✓ Labels installed: {dest_labels}")

        # Write manifest
        manifest = {
            "model_file": TFLITE_ASSET_NAME,
            "labels_file": LABELS_ASSET_NAME,
            "model_version": MODEL_VERSION,
            "sha256": model_hash,
            "input_size": INPUT_SIZE,
            "classes": CLASSES,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
        }
        (android_assets / "model_manifest.json").write_text(json.dumps(manifest, indent=2))
        print(f"  ✓ Manifest written: android/app/src/main/assets/model_manifest.json")
    else:
        print("\n  [!] TFLite conversion skipped. Android model asset NOT installed.")
        print("      Install tensorflow + onnx-tf and re-run to complete export.")

    # ── Save Training History ────────────────────────────────────────────────
    (output_dir / "training_history.json").write_text(json.dumps(history, indent=2))

    # ── Final Summary ────────────────────────────────────────────────────────
    gates = eval_report["acceptance_gates"]
    all_pass = (
        gates["overall_accuracy_pass"] and
        gates["macro_f1_pass"] and
        gates["all_class_recall_pass"]
    )
    print("\n" + "=" * 66)
    if all_pass and tflite_ok:
        print("  NIRMALTAG AI CLASSIFIER — REAL MODEL VERIFIED")
    elif not all_pass:
        print("  NIRMALTAG AI CLASSIFIER — RESEARCH/DEMO ONLY (metrics below target)")
        print("  Do NOT deploy as production model. Collect more data and retrain.")
    else:
        print("  NIRMALTAG AI CLASSIFIER — TRAINED (TFLite conversion incomplete)")
    print("=" * 66)


if __name__ == "__main__":
    main()
