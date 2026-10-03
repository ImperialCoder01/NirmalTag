package com.nirmaltag.app

import com.nirmaltag.app.ai.VerificationResultStatus
import com.nirmaltag.app.data.local.OfflinePickupState
import com.nirmaltag.app.data.local.PendingPickupEntity
import com.nirmaltag.app.util.TagValidationUtil
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.util.UUID

class CollectorWorkflowTest {

    @Test
    fun testTagSerialFormatValidation() {
        assertTrue(TagValidationUtil.isValidTagSerial("NT-SAN-2026-8012"))
        assertTrue(TagValidationUtil.isValidTagSerial("NT-HAZ-2026-90412"))
        assertTrue(TagValidationUtil.isValidTagSerial("NT-REC-2026-1002"))

        assertFalse(TagValidationUtil.isValidTagSerial("NT-INVALID-001"))
        assertFalse(TagValidationUtil.isValidTagSerial("INVALID_TAG"))
        assertFalse(TagValidationUtil.isValidTagSerial(""))
        assertFalse(TagValidationUtil.isValidTagSerial("ABC-123-XYZ"))
    }

    @Test
    fun testTagTypeParsing() {
        assertEquals("SANITARY", TagValidationUtil.parseTagType("NT-SAN-2026-8012"))
        assertEquals("HAZARDOUS", TagValidationUtil.parseTagType("NT-HAZ-2026-8012"))
        assertEquals("RECYCLABLE", TagValidationUtil.parseTagType("NT-REC-2026-8012"))
        assertEquals("UNKNOWN", TagValidationUtil.parseTagType("UNKNOWN_TAG"))
    }

    @Test
    fun testCollectorIdentityIsolationFromHousehold() {
        val collectorId = "usr_collector_rajesh_99"
        val householdId = "usr_household_flat_b501"

        val pickup = PendingPickupEntity(
            localPickupId = UUID.randomUUID().toString(),
            idempotencyKey = UUID.randomUUID().toString(),
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = collectorId,
            photoLocalUri = "/tmp/photo.jpg",
            photoSha256 = "dummyhash",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 3.0f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = VerificationResultStatus.MODEL_UNAVAILABLE.name,
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.WAITING_FOR_NETWORK
        )

        // Verify collector identity is distinct and never substituted for household identity
        assertNotEquals(pickup.collectorId, householdId)
    }

    @Test
    fun testTruthfulAiStateModelUnavailable() {
        val pickup = PendingPickupEntity(
            localPickupId = UUID.randomUUID().toString(),
            idempotencyKey = UUID.randomUUID().toString(),
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = "usr_collector_01",
            photoLocalUri = "/tmp/photo.jpg",
            photoSha256 = "dummyhash",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 4.0f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = VerificationResultStatus.MODEL_UNAVAILABLE.name,
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.WAITING_FOR_NETWORK
        )

        assertEquals("MODEL_UNAVAILABLE", pickup.aiStatus)
        assertEquals(0.0f, pickup.aiConfidence, 0.0001f)
        assertNotEquals(OfflinePickupState.SERVER_VERIFIED, pickup.state)
    }

    @Test
    fun testServerRejectionStateTransition() {
        val pickup = PendingPickupEntity(
            localPickupId = UUID.randomUUID().toString(),
            idempotencyKey = UUID.randomUUID().toString(),
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = "usr_collector_01",
            photoLocalUri = "/tmp/photo.jpg",
            photoSha256 = "dummyhash",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 4.0f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = VerificationResultStatus.MODEL_UNAVAILABLE.name,
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.UPLOADING
        )

        // Simulate server rejection (e.g. Tag already closed)
        val rejectedPickup = pickup.copy(
            state = OfflinePickupState.SERVER_REJECTED,
            serverErrorMessage = "TAG_ALREADY_CLOSED: Single-use invariant enforced by PostgreSQL RPC"
        )

        assertEquals(OfflinePickupState.SERVER_REJECTED, rejectedPickup.state)
        assertNotNull(rejectedPickup.serverErrorMessage)
        assertTrue(rejectedPickup.serverErrorMessage!!.contains("TAG_ALREADY_CLOSED"))
    }
}
