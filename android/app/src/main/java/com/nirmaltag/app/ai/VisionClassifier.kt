package com.nirmaltag.app.ai

import android.content.Context
import android.graphics.Bitmap

/**
 * Backward-compatible facade delegating to VisualVerificationEngine.
 */
class VisionClassifier(context: Context) {
    private val engine = VisualVerificationEngine(context)

    fun classifyEvidenceImage(bitmap: Bitmap): VisionVerificationOutput {
        return engine.evaluateEvidenceImage(bitmap)
    }
}
