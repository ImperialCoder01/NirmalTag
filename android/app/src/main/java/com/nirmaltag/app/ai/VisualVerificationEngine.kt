package com.nirmaltag.app.ai

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.common.FileUtil
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder

// ── Output contract ───────────────────────────────────────────────────────────

enum class WasteClass(val displayName: String) {
    SANITARY_VISIBLE("Sanitary Visible"),
    SPECIAL_CARE_VISIBLE("Special Care Visible"),
    GENERAL_WASTE_VISIBLE("General Waste Visible"),
    EMPTY_OR_UNCLEAR("Empty or Unclear"),
    NON_WASTE_OR_INVALID_CAPTURE("Non-Waste / Invalid Capture"),
    UNKNOWN("Unknown");

    companion object {
        fun fromLabel(label: String): WasteClass =
            entries.firstOrNull { it.name == label.trim().uppercase() } ?: UNKNOWN
    }
}

enum class AiVerificationStatus {
    CLASSIFIED,        // Model ran, confidence ≥ threshold → AI_VERIFIED evidence
    LOW_CONFIDENCE,    // Model ran, confidence < threshold → AI_UNCERTAIN
    INFERENCE_FAILED,  // Model present but inference threw an exception
    INVALID_IMAGE,     // Null or empty bitmap supplied
    MODEL_LOAD_FAILED, // Model file present but could not be loaded
    MODEL_UNAVAILABLE  // Model asset not found in APK assets
}

/**
 * Structured result returned by [VisualVerificationEngine].
 *
 * IMPORTANT: These fields are stored in [PendingPickupEntity] and synced
 * to the server as *evidence metadata*. They do NOT control credit awards.
 * The server-side pickup transaction is the sole financial authority.
 */
data class VisualVerificationResult(
    val status: AiVerificationStatus,
    val predictedClass: WasteClass,
    val confidence: Float,           // 0.0f when model unavailable or inference failed
    val modelVersion: String,
    val inferenceTimeMs: Long,
    val isModelAvailable: Boolean,
    val isDomainModel: Boolean,      // true = NirmalTag-specific model; false = fallback
    val thresholdPassed: Boolean,    // confidence >= AI_CONFIDENCE_THRESHOLD
    val timestamp: Long = System.currentTimeMillis()
)

// Backward-compat alias used by pre-21 call sites (MainActivity, VisionClassifier)
typealias VisionVerificationOutput = VisualVerificationResult

// Legacy status alias — ensures old code referencing VerificationResultStatus compiles
typealias VerificationResultStatus = AiVerificationStatus

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * NirmalTag On-Device AI Visual Verification Engine
 *
 * Runs a MobileNetV3-Small INT8 TFLite model trained on NirmalTag waste
 * categories to classify photographic evidence captured by the Collector.
 *
 * Classification task: AI-Assisted Visual Verification
 * The model classifies *visible* photographic evidence only.
 * It does NOT prove the complete contents of a sealed or opaque pouch.
 *
 * Failure hierarchy (safe fallback at every level):
 *   MODEL_UNAVAILABLE  → asset not in APK
 *   MODEL_LOAD_FAILED  → asset corrupt / TFLite version mismatch
 *   INVALID_IMAGE      → null or zero-dimension bitmap
 *   INFERENCE_FAILED   → runtime exception during interpreter.run()
 *   LOW_CONFIDENCE     → model ran but confidence < threshold
 *   CLASSIFIED         → real, usable classification result
 */
class VisualVerificationEngine(private val context: Context) {

    // ── Configuration ─────────────────────────────────────────────────────────
    private val modelAssetPath  = "nirmaltag_waste_classifier_v1.tflite"
    private val labelsAssetPath = "labels.txt"
    private val modelVersion    = "nirmaltag-v1"

    /** Confidence gate: results below this are LOW_CONFIDENCE, not CLASSIFIED. */
    private val confidenceThreshold = AI_CONFIDENCE_THRESHOLD

    /** Input tensor: [1 × 224 × 224 × 3], float32 — matches MobileNetV3-Small export. */
    private val inputSize = 224

    // Normalization constants (ImageNet mean/std used during training)
    private val imagenetMean = floatArrayOf(0.485f, 0.456f, 0.406f)
    private val imagenetStd  = floatArrayOf(0.229f, 0.224f, 0.225f)

    // ── Model state ───────────────────────────────────────────────────────────
    private var interpreter: Interpreter? = null
    private var labels: List<String> = emptyList()
    private var modelLoaded = false

    init {
        initializeModel()
    }

    // ── Initialization ────────────────────────────────────────────────────────

    private fun initializeModel() {
        if (!isModelAssetPresent()) {
            Log.w(TAG, "Model asset '$modelAssetPath' not found in APK assets. " +
                    "Run ai/training/train.py to produce a trained .tflite model.")
            modelLoaded = false
            return
        }
        try {
            val modelBuffer = FileUtil.loadMappedFile(context, modelAssetPath)
            val options = Interpreter.Options().apply {
                setNumThreads(2)          // Conservative: safe on low-RAM devices
                setUseXNNPACK(true)       // XNNPACK accelerates float ops on ARM
            }
            interpreter = Interpreter(modelBuffer, options)
            labels = loadLabels()
            modelLoaded = true
            Log.i(TAG, "TFLite model loaded: $modelVersion  labels=${labels.size}")
        } catch (e: IOException) {
            Log.e(TAG, "Failed to load TFLite model from assets: ${e.message}", e)
            modelLoaded = false
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error loading TFLite model: ${e.message}", e)
            modelLoaded = false
        }
    }

    private fun loadLabels(): List<String> {
        return try {
            context.assets.open(labelsAssetPath).bufferedReader().readLines()
                .map { it.trim() }
                .filter { it.isNotEmpty() }
        } catch (e: IOException) {
            Log.w(TAG, "labels.txt not found in assets; using built-in class names")
            WasteClass.entries.filter { it != WasteClass.UNKNOWN }.map { it.name }
        }
    }

    fun isModelAssetPresent(): Boolean {
        return try {
            val assets = context.assets.list("") ?: emptyArray()
            assets.contains(modelAssetPath)
        } catch (_: Exception) {
            false
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Evaluate a still evidence image captured by the Collector.
     *
     * Call this AFTER capturing a still image (not on every CameraX frame).
     * The bitmap will be scaled to [inputSize × inputSize] internally.
     *
     * @param bitmap Non-null evidence image from CameraX still capture
     * @return [VisualVerificationResult] — never throws, always returns a safe result
     */
    fun evaluateEvidenceImage(bitmap: Bitmap): VisualVerificationResult {
        val startTime = System.currentTimeMillis()

        // Guard: model asset missing
        if (!isModelAssetPresent()) {
            return unavailableResult(startTime)
        }

        // Guard: model failed to load
        if (!modelLoaded || interpreter == null) {
            val duration = System.currentTimeMillis() - startTime
            return VisualVerificationResult(
                status           = AiVerificationStatus.MODEL_LOAD_FAILED,
                predictedClass   = WasteClass.UNKNOWN,
                confidence       = 0.0f,
                modelVersion     = modelVersion,
                inferenceTimeMs  = duration,
                isModelAvailable = true,
                isDomainModel    = true,
                thresholdPassed  = false
            )
        }

        // Guard: invalid image
        if (bitmap.width == 0 || bitmap.height == 0) {
            val duration = System.currentTimeMillis() - startTime
            return VisualVerificationResult(
                status           = AiVerificationStatus.INVALID_IMAGE,
                predictedClass   = WasteClass.UNKNOWN,
                confidence       = 0.0f,
                modelVersion     = modelVersion,
                inferenceTimeMs  = duration,
                isModelAvailable = true,
                isDomainModel    = true,
                thresholdPassed  = false
            )
        }

        return try {
            val inputBuffer  = preprocessBitmap(bitmap)
            val outputBuffer = Array(1) { FloatArray(labels.size) }

            interpreter!!.run(inputBuffer, outputBuffer)
            val probs   = softmax(outputBuffer[0])
            val predIdx = probs.indices.maxByOrNull { probs[it] } ?: 0
            val conf    = probs[predIdx]

            val duration = System.currentTimeMillis() - startTime
            val labelName = labels.getOrNull(predIdx) ?: WasteClass.UNKNOWN.name
            val wasteClass = WasteClass.fromLabel(labelName)
            val passed = conf >= confidenceThreshold

            val status = if (passed) AiVerificationStatus.CLASSIFIED
                         else         AiVerificationStatus.LOW_CONFIDENCE

            Log.i(TAG, "Inference complete: class=$labelName conf=${conf.formatPct()} " +
                    "threshold=${confidenceThreshold.formatPct()} status=$status time=${duration}ms")

            VisualVerificationResult(
                status           = status,
                predictedClass   = wasteClass,
                confidence       = conf,
                modelVersion     = modelVersion,
                inferenceTimeMs  = duration,
                isModelAvailable = true,
                isDomainModel    = true,
                thresholdPassed  = passed
            )
        } catch (e: Exception) {
            Log.e(TAG, "Inference runtime error: ${e.message}", e)
            val duration = System.currentTimeMillis() - startTime
            VisualVerificationResult(
                status           = AiVerificationStatus.INFERENCE_FAILED,
                predictedClass   = WasteClass.UNKNOWN,
                confidence       = 0.0f,
                modelVersion     = modelVersion,
                inferenceTimeMs  = duration,
                isModelAvailable = true,
                isDomainModel    = true,
                thresholdPassed  = false
            )
        }
    }

    /** Explicit resource release. Call when the Collector screen exits. */
    fun close() {
        interpreter?.close()
        interpreter = null
        modelLoaded = false
    }

    // ── Preprocessing ─────────────────────────────────────────────────────────

    /**
     * Resize bitmap to [inputSize × inputSize], normalize per ImageNet statistics,
     * and pack into a float32 [1, H, W, C] ByteBuffer for TFLite.
     */
    private fun preprocessBitmap(bitmap: Bitmap): ByteBuffer {
        val scaled = Bitmap.createScaledBitmap(bitmap, inputSize, inputSize, true)
        // 1 batch × H × W × 3 channels × 4 bytes (float32)
        val buffer = ByteBuffer.allocateDirect(1 * inputSize * inputSize * 3 * 4)
        buffer.order(ByteOrder.nativeOrder())

        val pixels = IntArray(inputSize * inputSize)
        scaled.getPixels(pixels, 0, inputSize, 0, 0, inputSize, inputSize)

        for (pixel in pixels) {
            val r = ((pixel shr 16) and 0xFF) / 255.0f
            val g = ((pixel shr 8)  and 0xFF) / 255.0f
            val b = (pixel and 0xFF)           / 255.0f
            buffer.putFloat((r - imagenetMean[0]) / imagenetStd[0])
            buffer.putFloat((g - imagenetMean[1]) / imagenetStd[1])
            buffer.putFloat((b - imagenetMean[2]) / imagenetStd[2])
        }
        buffer.rewind()

        // Recycle scaled bitmap only if it's a new allocation
        if (scaled !== bitmap) scaled.recycle()

        return buffer
    }

    // ── Math ──────────────────────────────────────────────────────────────────

    private fun softmax(logits: FloatArray): FloatArray {
        val maxVal = logits.max()
        val exp    = logits.map { Math.exp((it - maxVal).toDouble()).toFloat() }.toFloatArray()
        val sum    = exp.sum()
        return exp.map { it / sum }.toFloatArray()
    }

    private fun Float.formatPct(): String = "${"%.1f".format(this * 100)}%"

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun unavailableResult(startTime: Long): VisualVerificationResult {
        return VisualVerificationResult(
            status           = AiVerificationStatus.MODEL_UNAVAILABLE,
            predictedClass   = WasteClass.UNKNOWN,
            confidence       = 0.0f,
            modelVersion     = "MODEL_UNAVAILABLE",
            inferenceTimeMs  = System.currentTimeMillis() - startTime,
            isModelAvailable = false,
            isDomainModel    = false,
            thresholdPassed  = false
        )
    }

    companion object {
        private const val TAG = "VisualVerificationEngine"

        /** Confidence threshold below which result is LOW_CONFIDENCE, not CLASSIFIED. */
        const val AI_CONFIDENCE_THRESHOLD = 0.80f

        /** Legacy compat: maps old status name to new enum */
        val MODEL_UNAVAILABLE get() = AiVerificationStatus.MODEL_UNAVAILABLE
    }
}
