package com.nirmaltag.app.ai

import android.content.Context
import android.graphics.Bitmap

/**
 * Backward-compatible facade delegating to [VisualVerificationEngine].
 * Maintains the call-site contract for any code that instantiates
 * VisionClassifier directly.
 */
class VisionClassifier(context: Context) {
    private val engine = VisualVerificationEngine(context)

    fun classifyEvidenceImage(bitmap: Bitmap): VisualVerificationResult =
        engine.evaluateEvidenceImage(bitmap)

    fun isModelAvailable(): Boolean = engine.isModelAssetPresent()

    fun close() = engine.close()
}
