# NIRMALTAG — AI CAPABILITY STATUS & VISUAL VERIFICATION POLICY

**Platform**: NirmalTag Civic Tech Platform  
**Version**: `1.0.0`  
**Current AI Status**: `MODEL_UNAVAILABLE`  

---

## 1. CURRENT CAPABILITY STATUS & UX TRANSPARENCY

- **Current Status**: `MODEL_UNAVAILABLE`
- **Asset Directory**: `android/app/src/main/assets/`
- **Current Behavior**: No domain-trained `.tflite` model asset is currently bundled in the mobile application binary.
- **Truthful Representation**: NirmalTag does **NOT** claim that trained AI classification is currently active. The application handles evidence evaluation via a transparent visual inspection workflow.
- **UX Terminology**: All client interfaces present truthful terminology: *"Visual verification performed without AI model"* or *"AI verification unavailable"*. Zero mock confidence metrics or fake classification percentages are generated.

---

## 2. MOBILE INFERENCE ENGINE ARCHITECTURE (`VisualVerificationEngine.kt`)

The native Android app embeds `VisualVerificationEngine.kt` to check model availability dynamically:

```kotlin
fun evaluateEvidenceImage(bitmap: Bitmap): VisionVerificationOutput {
    if (!isModelAssetPresent()) {
        return VisionVerificationOutput(
            status = VerificationResultStatus.MODEL_UNAVAILABLE,
            confidence = 0.0f,
            modelVersion = "MODEL_UNAVAILABLE (Asset Missing)",
            inferenceTimeMs = duration,
            isModelAvailable = false
        )
    }
    // Execution path when .tflite asset is physically placed in assets/
}
```

---

## 3. FUTURE MODEL INTEGRATION REQUIREMENTS

When a domain-trained model asset is ready for deployment in a future release:
1. **Asset File**: Place `mobilenetv3_sanitary_quant.tflite` into `android/app/src/main/assets/`.
2. **Dataset & Training**: Model must be trained on classified sanitary & special-care waste pouch images.
3. **Model Evaluation Metrics**: Document dataset size, validation accuracy, false positive/negative rates, and confidence thresholds.
4. **On-Device Inference**: TFLite interpreter handles offline inference directly on device hardware without external server calls.
