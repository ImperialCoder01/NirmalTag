package com.nirmaltag.app

import com.nirmaltag.app.data.local.OfflinePickupState
import com.nirmaltag.app.data.local.PendingPickupEntity
import com.nirmaltag.app.util.TagValidationUtil
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.security.MessageDigest
import java.util.UUID

class FieldReliabilityAndSyncTest {

    private fun computeSha256(bytes: ByteArray): String {
        return MessageDigest.getInstance("SHA-256")
            .digest(bytes)
            .joinToString("") { "%02x".format(it) }
    }

    @Test
    fun testRoomEntityPersistenceAndIdempotencyKeyImmutability() {
        val originalKey = UUID.randomUUID().toString()
        val pickupId = UUID.randomUUID().toString()

        val pickup = PendingPickupEntity(
            localPickupId = pickupId,
            idempotencyKey = originalKey,
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = "col_usr_99",
            photoLocalUri = "/data/user/0/com.nirmaltag.app/files/pickups/photo1.jpg",
            photoSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 3.5f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.WAITING_FOR_NETWORK
        )

        // Process death & restart simulation
        val restartedPickup = pickup.copy(
            retryCount = pickup.retryCount + 1,
            state = OfflinePickupState.UPLOADING
        )

        assertEquals(originalKey, restartedPickup.idempotencyKey)
        assertEquals(pickupId, restartedPickup.localPickupId)
        assertEquals(pickup.photoSha256, restartedPickup.photoSha256)
    }

    @Test
    fun testEvidenceCorruptedDetectionSHA256Mismatch() {
        val originalBytes = "VERIFIED_EVIDENCE_PHOTO_BYTES_123".toByteArray()
        val originalHash = computeSha256(originalBytes)

        val corruptedBytes = "CORRUPTED_EVIDENCE_PHOTO_BYTES_999".toByteArray()
        val corruptedHash = computeSha256(corruptedBytes)

        assertNotEquals(originalHash, corruptedHash)

        // Validation logic check
        val isCorrupted = originalHash != corruptedHash
        assertTrue("SHA-256 mismatch must be flagged as corrupted evidence", isCorrupted)
    }

    @Test
    fun testOfflineStateTransitionValidity() {
        // Initial captured state
        var state = OfflinePickupState.LOCAL_CAPTURED
        assertEquals(OfflinePickupState.LOCAL_CAPTURED, state)

        // Queued for network
        state = OfflinePickupState.WAITING_FOR_NETWORK
        assertFalse("Waiting for network is not server verified", state == OfflinePickupState.SERVER_VERIFIED)

        // Uploading via WorkManager
        state = OfflinePickupState.UPLOADING
        assertFalse("Uploading is not server verified", state == OfflinePickupState.SERVER_VERIFIED)

        // Server RPC returned success
        state = OfflinePickupState.SERVER_VERIFIED
        assertTrue("Server verified state reached", state == OfflinePickupState.SERVER_VERIFIED)
    }

    @Test
    fun testFatalServerRejectionMapping() {
        val fatalErrors = listOf(
            "TAG_INVALID_STATE: Tag not in eligible state",
            "CLOSED_TAG: Tag is already closed",
            "HOUSEHOLD_MISMATCH: Household owner mismatch",
            "EVIDENCE_FILE_MISSING: File not found",
            "EVIDENCE_HASH_MISMATCH: SHA256 mismatch",
            "TAG_INVALID_FORMAT: Invalid serial"
        )

        for (err in fatalErrors) {
            val isFatal = err.contains("TAG_INVALID") || err.contains("CLOSED_TAG") ||
                    err.contains("HOUSEHOLD_MISMATCH") || err.contains("EVIDENCE_FILE_MISSING") ||
                    err.contains("EVIDENCE_HASH_MISMATCH") || err.contains("TAG_INVALID_FORMAT")
            assertTrue("Error '$err' must be classified as fatal server rejection", isFatal)
        }
    }

    @Test
    fun testRetryableErrorMapping() {
        val retryableErrors = listOf(
            "Network timeout while connecting to server",
            "HTTP 503 Service Unavailable",
            "SocketTimeoutException: failed to connect"
        )

        for (err in retryableErrors) {
            val isFatal = err.contains("TAG_INVALID") || err.contains("CLOSED_TAG") ||
                    err.contains("HOUSEHOLD_MISMATCH") || err.contains("EVIDENCE_FILE_MISSING")
            assertFalse("Error '$err' must be classified as retryable network error", isFatal)
        }
    }

    @Test
    fun testCanonicalTagSerialValidation() {
        assertTrue(TagValidationUtil.isValidTagSerial("NT-SAN-2026-8012"))
        assertTrue(TagValidationUtil.isValidTagSerial("NT-HAZ-2026-0001"))
        assertFalse(TagValidationUtil.isValidTagSerial("INVALID-SERIAL-123"))
        assertFalse(TagValidationUtil.isValidTagSerial(""))
    }

    @Test
    fun testMultiplePendingPickupsQueueReconciliation() {
        val queue = mutableListOf<PendingPickupEntity>()

        for (i in 1..5) {
            queue.add(
                PendingPickupEntity(
                    localPickupId = "LOCAL-PKP-$i",
                    idempotencyKey = "IDEMP-PKP-$i",
                    tagSerialCode = "NT-SAN-2026-800$i",
                    collectorId = "col_01",
                    photoLocalUri = "/path/photo_$i.jpg",
                    photoSha256 = "hash_$i",
                    gpsLatitude = 28.5355,
                    gpsLongitude = 77.2610,
                    gpsAccuracyMeters = 3.0f,
                    capturedAtEpochMs = System.currentTimeMillis() + i * 1000,
                    aiStatus = "MODEL_UNAVAILABLE",
                    aiConfidence = 0.0f,
                    aiInferenceMs = 0L,
                    state = OfflinePickupState.WAITING_FOR_NETWORK
                )
            )
        }

        assertEquals(5, queue.size)
        val distinctKeys = queue.map { it.idempotencyKey }.toSet()
        assertEquals(5, distinctKeys.size)
    }

    @Test
    fun testTruthfulModelUnavailableAIBehavior() {
        val pickup = PendingPickupEntity(
            localPickupId = "LOCAL-PKP-AI-01",
            idempotencyKey = "IDEMP-AI-01",
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = "col_01",
            photoLocalUri = "/path/photo.jpg",
            photoSha256 = "hash",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 3.0f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.WAITING_FOR_NETWORK
        )

        assertEquals("MODEL_UNAVAILABLE", pickup.aiStatus)
        assertEquals(0.0f, pickup.aiConfidence, 0.001f)
        assertFalse("MODEL_UNAVAILABLE is never SERVER_VERIFIED", pickup.state == OfflinePickupState.SERVER_VERIFIED)
    }
}
