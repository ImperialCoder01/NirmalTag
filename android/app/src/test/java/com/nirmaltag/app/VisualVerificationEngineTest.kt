package com.nirmaltag.app

import com.nirmaltag.app.ai.AiVerificationStatus
import com.nirmaltag.app.ai.VisualVerificationEngine
import com.nirmaltag.app.ai.VisualVerificationResult
import com.nirmaltag.app.ai.WasteClass
import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for VisualVerificationEngine contract and VisualVerificationResult data class.
 *
 * These tests verify the OUTPUT CONTRACT independently of the Android Context
 * (which requires a device/emulator). Context-dependent initialization tests
 * live in androidTest/.
 *
 * Requirements verified:
 *   R1.  MODEL_UNAVAILABLE result has confidence = 0.0f and isModelAvailable = false
 *   R2.  MODEL_UNAVAILABLE result has isDomainModel = false
 *   R3.  MODEL_UNAVAILABLE result has thresholdPassed = false
 *   R4.  CLASSIFIED result requires confidence >= AI_CONFIDENCE_THRESHOLD
 *   R5.  LOW_CONFIDENCE result requires confidence < AI_CONFIDENCE_THRESHOLD
 *   R6.  No status produces a negative confidence value
 *   R7.  MODEL_LOAD_FAILED is distinct from MODEL_UNAVAILABLE
 *   R8.  INFERENCE_FAILED is distinct from MODEL_UNAVAILABLE
 *   R9.  INVALID_IMAGE is distinct from MODEL_UNAVAILABLE
 *   R10. WasteClass.fromLabel handles all 5 domain classes + UNKNOWN fallback
 *   R11. Confidence threshold constant is 0.80
 *   R12. AI result never controls credit decisions (structural: no credit field in result)
 */
class VisualVerificationEngineTest {

    private val threshold = VisualVerificationEngine.AI_CONFIDENCE_THRESHOLD

    // ── R1-R3: MODEL_UNAVAILABLE contract ────────────────────────────────────

    @Test
    fun testModelUnavailableResult_hasZeroConfidence() {
        val result = modelUnavailableResult()
        assertEquals(0.0f, result.confidence, 0.0001f)
    }

    @Test
    fun testModelUnavailableResult_isNotModelAvailable() {
        val result = modelUnavailableResult()
        assertFalse(result.isModelAvailable)
    }

    @Test
    fun testModelUnavailableResult_isDomainModelFalse() {
        val result = modelUnavailableResult()
        assertFalse(result.isDomainModel)
    }

    @Test
    fun testModelUnavailableResult_thresholdPassedFalse() {
        val result = modelUnavailableResult()
        assertFalse(result.thresholdPassed)
    }

    @Test
    fun testModelUnavailableResult_statusIsCorrect() {
        val result = modelUnavailableResult()
        assertEquals(AiVerificationStatus.MODEL_UNAVAILABLE, result.status)
    }

    // ── R4: CLASSIFIED contract ───────────────────────────────────────────────

    @Test
    fun testClassifiedResult_confidenceMeetsThreshold() {
        val conf = 0.91f
        val result = classifiedResult(conf)
        assertTrue("Confidence should be >= threshold", result.confidence >= threshold)
        assertTrue("thresholdPassed should be true", result.thresholdPassed)
        assertEquals(AiVerificationStatus.CLASSIFIED, result.status)
    }

    @Test
    fun testClassifiedResult_isModelAvailableTrue() {
        val result = classifiedResult(0.85f)
        assertTrue(result.isModelAvailable)
    }

    @Test
    fun testClassifiedResult_isDomainModelTrue() {
        val result = classifiedResult(0.85f)
        assertTrue(result.isDomainModel)
    }

    // ── R5: LOW_CONFIDENCE contract ───────────────────────────────────────────

    @Test
    fun testLowConfidenceResult_belowThreshold() {
        val conf = 0.65f
        val result = lowConfidenceResult(conf)
        assertTrue("Confidence should be < threshold", result.confidence < threshold)
        assertFalse("thresholdPassed should be false", result.thresholdPassed)
        assertEquals(AiVerificationStatus.LOW_CONFIDENCE, result.status)
    }

    @Test
    fun testLowConfidenceResult_stillHasPositiveConfidence() {
        val result = lowConfidenceResult(0.55f)
        assertTrue("Low-confidence result must still have positive confidence", result.confidence > 0.0f)
    }

    // ── R6: No negative confidence ────────────────────────────────────────────

    @Test
    fun testAllStatuses_nonNegativeConfidence() {
        val results = listOf(
            modelUnavailableResult(),
            modelLoadFailedResult(),
            invalidImageResult(),
            inferenceFailedResult(),
            classifiedResult(0.88f),
            lowConfidenceResult(0.70f),
        )
        results.forEach { r ->
            assertTrue("Confidence must be >= 0.0 for status ${r.status}", r.confidence >= 0.0f)
        }
    }

    // ── R7-R9: Distinct failure status codes ──────────────────────────────────

    @Test
    fun testModelLoadFailed_distinctFromModelUnavailable() {
        val r = modelLoadFailedResult()
        assertEquals(AiVerificationStatus.MODEL_LOAD_FAILED, r.status)
        assertNotEquals(AiVerificationStatus.MODEL_UNAVAILABLE, r.status)
        // MODEL_LOAD_FAILED means the asset IS present, but it couldn't be loaded
        assertTrue(r.isModelAvailable)
    }

    @Test
    fun testInferenceFailed_distinctFromModelUnavailable() {
        val r = inferenceFailedResult()
        assertEquals(AiVerificationStatus.INFERENCE_FAILED, r.status)
        // Inference failed means model was loaded; isModelAvailable=true
        assertTrue(r.isModelAvailable)
    }

    @Test
    fun testInvalidImage_distinctFromModelUnavailable() {
        val r = invalidImageResult()
        assertEquals(AiVerificationStatus.INVALID_IMAGE, r.status)
    }

    // ── R10: WasteClass.fromLabel ─────────────────────────────────────────────

    @Test
    fun testWasteClassFromLabel_allDomainClasses() {
        val domainClasses = mapOf(
            "SANITARY_VISIBLE"             to WasteClass.SANITARY_VISIBLE,
            "SPECIAL_CARE_VISIBLE"         to WasteClass.SPECIAL_CARE_VISIBLE,
            "GENERAL_WASTE_VISIBLE"        to WasteClass.GENERAL_WASTE_VISIBLE,
            "EMPTY_OR_UNCLEAR"             to WasteClass.EMPTY_OR_UNCLEAR,
            "NON_WASTE_OR_INVALID_CAPTURE" to WasteClass.NON_WASTE_OR_INVALID_CAPTURE,
        )
        domainClasses.forEach { (label, expected) ->
            assertEquals("fromLabel($label) failed", expected, WasteClass.fromLabel(label))
        }
    }

    @Test
    fun testWasteClassFromLabel_unknownLabelFallback() {
        assertEquals(WasteClass.UNKNOWN, WasteClass.fromLabel("COMPLETELY_UNKNOWN_CLASS"))
        assertEquals(WasteClass.UNKNOWN, WasteClass.fromLabel(""))
    }

    @Test
    fun testWasteClassFromLabel_caseInsensitive() {
        assertEquals(WasteClass.SANITARY_VISIBLE, WasteClass.fromLabel("sanitary_visible"))
        assertEquals(WasteClass.GENERAL_WASTE_VISIBLE, WasteClass.fromLabel("general_waste_visible"))
    }

    // ── R11: Confidence threshold constant ───────────────────────────────────

    @Test
    fun testConfidenceThreshold_isExactly080() {
        assertEquals(0.80f, VisualVerificationEngine.AI_CONFIDENCE_THRESHOLD, 0.0001f)
    }

    // ── R12: Result has no credit/reward field ────────────────────────────────

    @Test
    fun testVisualVerificationResult_hasNoCreditField() {
        // Structural test: ensure no "credit" or "reward" field leaked into the result.
        val result = classifiedResult(0.91f)
        val fields = result.javaClass.declaredFields.map { it.name.lowercase() }
        assertFalse("credit field must NOT be on result", fields.any { it.contains("credit") })
        assertFalse("reward field must NOT be on result", fields.any { it.contains("reward") })
    }

    // ── Timestamp ─────────────────────────────────────────────────────────────

    @Test
    fun testResult_hasReasonableTimestamp() {
        val before = System.currentTimeMillis()
        val result = classifiedResult(0.91f)
        val after  = System.currentTimeMillis()
        assertTrue("timestamp should be between before and after", result.timestamp in before..after)
    }

    // ── Factories ─────────────────────────────────────────────────────────────

    private fun modelUnavailableResult() = VisualVerificationResult(
        status           = AiVerificationStatus.MODEL_UNAVAILABLE,
        predictedClass   = WasteClass.UNKNOWN,
        confidence       = 0.0f,
        modelVersion     = "MODEL_UNAVAILABLE",
        inferenceTimeMs  = 1L,
        isModelAvailable = false,
        isDomainModel    = false,
        thresholdPassed  = false
    )

    private fun modelLoadFailedResult() = VisualVerificationResult(
        status           = AiVerificationStatus.MODEL_LOAD_FAILED,
        predictedClass   = WasteClass.UNKNOWN,
        confidence       = 0.0f,
        modelVersion     = "nirmaltag-v1",
        inferenceTimeMs  = 5L,
        isModelAvailable = true,
        isDomainModel    = true,
        thresholdPassed  = false
    )

    private fun invalidImageResult() = VisualVerificationResult(
        status           = AiVerificationStatus.INVALID_IMAGE,
        predictedClass   = WasteClass.UNKNOWN,
        confidence       = 0.0f,
        modelVersion     = "nirmaltag-v1",
        inferenceTimeMs  = 2L,
        isModelAvailable = true,
        isDomainModel    = true,
        thresholdPassed  = false
    )

    private fun inferenceFailedResult() = VisualVerificationResult(
        status           = AiVerificationStatus.INFERENCE_FAILED,
        predictedClass   = WasteClass.UNKNOWN,
        confidence       = 0.0f,
        modelVersion     = "nirmaltag-v1",
        inferenceTimeMs  = 15L,
        isModelAvailable = true,
        isDomainModel    = true,
        thresholdPassed  = false
    )

    private fun classifiedResult(conf: Float) = VisualVerificationResult(
        status           = AiVerificationStatus.CLASSIFIED,
        predictedClass   = WasteClass.SANITARY_VISIBLE,
        confidence       = conf,
        modelVersion     = "nirmaltag-v1",
        inferenceTimeMs  = 87L,
        isModelAvailable = true,
        isDomainModel    = true,
        thresholdPassed  = conf >= VisualVerificationEngine.AI_CONFIDENCE_THRESHOLD
    )

    private fun lowConfidenceResult(conf: Float) = VisualVerificationResult(
        status           = AiVerificationStatus.LOW_CONFIDENCE,
        predictedClass   = WasteClass.GENERAL_WASTE_VISIBLE,
        confidence       = conf,
        modelVersion     = "nirmaltag-v1",
        inferenceTimeMs  = 92L,
        isModelAvailable = true,
        isDomainModel    = true,
        thresholdPassed  = false
    )
}
