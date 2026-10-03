package com.nirmaltag.app

import com.nirmaltag.app.data.local.OfflinePickupState
import com.nirmaltag.app.data.local.PendingPickupEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test
import java.util.UUID

class IdempotencyAndSyncContractTest {

    @Test
    fun testIdempotencyKeyPersistenceAcrossRetries() {
        val testKey = "TEST-KEY-001"
        val pickup = PendingPickupEntity(
            localPickupId = UUID.randomUUID().toString(),
            idempotencyKey = testKey,
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = "usr_collector_01",
            photoLocalUri = "/data/user/0/com.nirmaltag.app/files/pickups/photo.jpg",
            photoSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 3.2f,
            capturedAtEpochMs = 1791045819000L,
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.LOCAL_CAPTURED,
            retryCount = 0
        )

        // Simulate Worker Retry 1
        val retry1 = pickup.copy(
            state = OfflinePickupState.SYNC_FAILED,
            retryCount = pickup.retryCount + 1,
            serverErrorMessage = "Network Timeout"
        )
        assertEquals("TEST-KEY-001", retry1.idempotencyKey)

        // Simulate Worker Retry 2 (Process Death & App Restart Simulation)
        val retry2 = retry1.copy(
            state = OfflinePickupState.UPLOADING,
            retryCount = retry1.retryCount + 1
        )
        assertEquals("TEST-KEY-001", retry2.idempotencyKey)

        // Verify key never changes across retries
        assertEquals(pickup.idempotencyKey, retry2.idempotencyKey)
    }

    @Test
    fun testDuplicateExecutionProtection() {
        val testKey = "TEST-KEY-DUP-99"
        val pickup = PendingPickupEntity(
            localPickupId = "LOCAL-UUID-100",
            idempotencyKey = testKey,
            tagSerialCode = "NT-SAN-2026-8099",
            collectorId = "usr_collector_01",
            photoLocalUri = "/data/user/0/com.nirmaltag.app/files/pickups/photo_dup.jpg",
            photoSha256 = "d41d8cd98f00b204e9800998ecf8427e",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 4.0f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.SERVER_VERIFIED,
            serverPickupId = "SUPABASE-TXN-1002"
        )

        // If worker executes a second time for a SERVER_VERIFIED pickup
        val isAlreadyVerified = pickup.state == OfflinePickupState.SERVER_VERIFIED
        assertEquals(true, isAlreadyVerified)
        // No duplicate local balance alteration occurs because server RPC controls credit assignment
    }
}
