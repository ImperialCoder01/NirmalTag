"""
NirmalTag Waste Classifier — Test-Set Validation Script
=========================================================
Use this script to evaluate the installed TFLite model against
a controlled holdout test set.

Requirements:
  pip install tflite-runtime Pillow numpy scikit-learn tqdm
  (or: pip install tensorflow  # includes tflite interpreter)

Usage:
  python ai/training/validate.py --model android/app/src/main/assets/nirmaltag_waste_classifier_v1.tflite
                                 --labels android/app/src/main/assets/labels.txt
                                 --dataset ai/training/dataset

Output:
  Per-class precision, recall, F1, confusion matrix, and verdict.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix, f1_score
)
from tqdm import tqdm

INPUT_SIZE = 224


def load_labels(labels_path: Path) -> list[str]:
    return [l.strip() for l in labels_path.read_text().splitlines() if l.strip()]


def preprocess(image_path: Path) -> np.ndarray:
    """Load and normalize image for MobileNetV3-Small TFLite inference.
    Input  : path to any RGB image
    Output : float32 array [1, 224, 224, 3] in [0.0, 1.0] normalized
    """
    img = Image.open(image_path).convert("RGB").resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.array(img, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std
    return arr[np.newaxis, ...]  # [1, H, W, C]


def run_tflite_inference(interpreter, input_idx: int, output_idx: int,
                         image_path: Path) -> tuple[int, float, float]:
    """Returns (predicted_class_idx, confidence, inference_ms)."""
    import time
    arr = preprocess(image_path)
    interpreter.set_tensor(input_idx, arr)
    t0 = time.monotonic()
    interpreter.invoke()
    elapsed_ms = (time.monotonic() - t0) * 1000.0
    output = interpreter.get_tensor(output_idx)[0]
    # Apply softmax
    exp_out = np.exp(output - output.max())
    probs = exp_out / exp_out.sum()
    pred_idx = int(probs.argmax())
    confidence = float(probs[pred_idx])
    return pred_idx, confidence, elapsed_ms


def load_dataset(dataset_root: Path, labels: list[str]) -> list[tuple[Path, int]]:
    supported = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    items = []
    for idx, cls in enumerate(labels):
        cls_dir = dataset_root / cls
        if not cls_dir.exists():
            continue
        for p in cls_dir.rglob("*"):
            if p.is_file() and p.suffix.lower() in supported:
                items.append((p, idx))
    return items


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model",   required=True, help="Path to .tflite model")
    parser.add_argument("--labels",  required=True, help="Path to labels.txt")
    parser.add_argument("--dataset", required=True, help="Dataset root directory")
    parser.add_argument("--threshold", type=float, default=0.80,
                        help="Confidence threshold for AI_VERIFIED verdict")
    args = parser.parse_args()

    model_path  = Path(args.model)
    labels_path = Path(args.labels)
    dataset_root = Path(args.dataset)

    if not model_path.exists():
        print(f"[ERROR] Model not found: {model_path}")
        sys.exit(1)

    # Load interpreter
    try:
        try:
            import tflite_runtime.interpreter as tflite
            Interpreter = tflite.Interpreter
        except ImportError:
            import tensorflow as tf
            Interpreter = tf.lite.Interpreter

        interpreter = Interpreter(model_path=str(model_path))
        interpreter.allocate_tensors()
        input_idx  = interpreter.get_input_details()[0]["index"]
        output_idx = interpreter.get_output_details()[0]["index"]
        print(f"  TFLite model loaded: {model_path}")
        print(f"  Input  shape : {interpreter.get_input_details()[0]['shape']}")
        print(f"  Output shape : {interpreter.get_output_details()[0]['shape']}")

    except Exception as e:
        print(f"[ERROR] Failed to load TFLite model: {e}")
        sys.exit(1)

    labels = load_labels(labels_path)
    items  = load_dataset(dataset_root, labels)

    if not items:
        print("[ERROR] No images found in dataset. Cannot validate.")
        sys.exit(1)

    print(f"\n  Running inference on {len(items)} images …")

    true_labels, pred_labels = [], []
    inference_times = []

    for img_path, true_idx in tqdm(items, desc="  validate"):
        try:
            pred_idx, conf, ms = run_tflite_inference(
                interpreter, input_idx, output_idx, img_path)
            true_labels.append(true_idx)
            pred_labels.append(pred_idx)
            inference_times.append(ms)
        except Exception as e:
            print(f"  [WARN] Inference failed for {img_path.name}: {e}")

    if not true_labels:
        print("[ERROR] Zero successful inferences. Validation aborted.")
        sys.exit(1)

    acc = accuracy_score(true_labels, pred_labels)
    macro_f1 = f1_score(true_labels, pred_labels, average="macro", zero_division=0)
    cm = confusion_matrix(true_labels, pred_labels, labels=list(range(len(labels))))
    avg_inference_ms = np.mean(inference_times)

    print(f"\n── Validation Results ──────────────────────────────────────────")
    print(f"  Accuracy   : {acc:.4f}  (gate ≥ 0.85)")
    print(f"  Macro F1   : {macro_f1:.4f}  (gate ≥ 0.80)")
    print(f"  Avg inference: {avg_inference_ms:.1f} ms")
    print(f"\n  Classification Report:")
    print(classification_report(
        true_labels, pred_labels,
        labels=list(range(len(labels))),
        target_names=labels,
        zero_division=0
    ))
    print(f"  Confusion Matrix (rows=true, cols=pred):")
    for row in cm:
        print("    " + "  ".join(f"{v:4d}" for v in row))
    print(f"\n  Confidence threshold: {args.threshold}")
    print(f"  Status: {'PRODUCTION READY' if acc >= 0.85 and macro_f1 >= 0.80 else 'RESEARCH/DEMO ONLY'}")


if __name__ == "__main__":
    main()
