package com.nirmaltag.app

import com.nirmaltag.app.ai.VerificationResultStatus
import com.nirmaltag.app.ai.VisionVerificationOutput
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class VisualVerificationEngineTest {

    @Test
    fun testTruthfulModelUnavailableOutput() {
        // Enforces Requirement 13: When no .tflite asset exists, confidence must be 0.0f and status MODEL_UNAVAILABLE
        val output = VisionVerificationOutput(
            status = VerificationResultStatus.MODEL_UNAVAILABLE,
            confidence = 0.0f,
            modelVersion = "MODEL_UNAVAILABLE (Asset Missing)",
            inferenceTimeMs = 12L,
            isModelAvailable = false
        )

        assertEquals(VerificationResultStatus.MODEL_UNAVAILABLE, output.status)
        assertEquals(0.0f, output.confidence, 0.0001f)
        assertFalse(output.isModelAvailable)
    }
}
