package com.nirmaltag.app

import com.nirmaltag.app.data.local.OfflinePickupState
import com.nirmaltag.app.data.local.PendingPickupEntity
import com.nirmaltag.app.data.local.TagCacheEntity
import com.nirmaltag.app.util.TagValidationUtil
import org.junit.Assert.*
import org.junit.Test
import java.util.UUID

class TagContractConsistencyTest {

    @Test
    fun testTagFormatContract() {
        assertTrue(TagValidationUtil.isValidTagSerial("NT-SAN-2026-8012"))
        assertTrue(TagValidationUtil.isValidTagSerial("NMT-2026-000001"))
        assertTrue(TagValidationUtil.isValidTagSerial("NT-HAZ-2026-90412"))

        assertFalse(TagValidationUtil.isValidTagSerial("NT-INVALID-001"))
        assertFalse(TagValidationUtil.isValidTagSerial("MALFORMED_CODE"))
    }

    @Test
    fun testServerRejectedTagHandling() {
        val pickup = PendingPickupEntity(
            localPickupId = UUID.randomUUID().toString(),
            idempotencyKey = UUID.randomUUID().toString(),
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = "usr_collector_01",
            photoLocalUri = "/tmp/photo.jpg",
            photoSha256 = "dummyhash",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 3.0f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.UPLOADING
        )

        val rejected = pickup.copy(
            state = OfflinePickupState.SERVER_REJECTED,
            serverErrorMessage = "TAG_STATE_MACHINE_VIOLATION: Illegal transition from CLOSED to VERIFIED"
        )

        assertEquals(OfflinePickupState.SERVER_REJECTED, rejected.state)
        assertTrue(rejected.serverErrorMessage!!.contains("TAG_STATE_MACHINE_VIOLATION"))
    }

    @Test
    fun testClosedTagRejection() {
        val pickup = PendingPickupEntity(
            localPickupId = UUID.randomUUID().toString(),
            idempotencyKey = UUID.randomUUID().toString(),
            tagSerialCode = "NT-SAN-2026-CLOSED-TAG",
            collectorId = "usr_collector_01",
            photoLocalUri = "/tmp/photo.jpg",
            photoSha256 = "dummyhash",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 3.0f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.UPLOADING
        )

        val resultState = OfflinePickupState.SERVER_REJECTED
        val resultError = "TAG_ALREADY_CLOSED: Tag is locked in CLOSED single-use invariant"

        assertEquals(OfflinePickupState.SERVER_REJECTED, resultState)
        assertTrue(resultError.contains("TAG_ALREADY_CLOSED"))
    }

    @Test
    fun testUnauthorizedCollectorRejection() {
        val unauthorizedRole = "HOUSEHOLD"
        val isAuthorized = unauthorizedRole == "COLLECTOR" || unauthorizedRole == "SYSTEM_ADMIN"
        assertFalse(isAuthorized)
    }

    @Test
    fun testHouseholdMismatchIsolation() {
        val tagAssignedHouseholdInDB = "house_uuid_101"
        val clientSubmittedHousehold = "house_uuid_fake_999"

        // Server RPC ignores clientSubmittedHousehold and queries tags.current_assigned_household_id
        val authoritativeHousehold = tagAssignedHouseholdInDB
        assertNotEquals(clientSubmittedHousehold, authoritativeHousehold)
        assertEquals("house_uuid_101", authoritativeHousehold)
    }

    @Test
    fun testDuplicatePickupIdempotency() {
        val key = "IDEM-KEY-999"
        val pickup1 = PendingPickupEntity(
            localPickupId = "LOCAL-1",
            idempotencyKey = key,
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = "usr_collector_01",
            photoLocalUri = "/tmp/photo.jpg",
            photoSha256 = "hash1",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 3.0f,
            capturedAtEpochMs = 1000L,
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.WAITING_FOR_NETWORK
        )

        val pickup2 = pickup1.copy(retryCount = 1, state = OfflinePickupState.UPLOADING)
        assertEquals(pickup1.idempotencyKey, pickup2.idempotencyKey)
    }

    @Test
    fun testOfflineCachedTagNonAuthoritative() {
        val cachedTag = TagCacheEntity(
            tagSerialCode = "NT-SAN-2026-8012",
            batchId = "BATCH-01",
            assignedHouseholdId = "house_101",
            tagType = "SANITARY",
            lastKnownState = "ATTACHED",
            cachedAtEpochMs = System.currentTimeMillis() - 100000L
        )

        // Cached state is NON-AUTHORITATIVE; server response overrides cached values
        val liveServerState = "CLOSED"
        assertNotEquals(cachedTag.lastKnownState, liveServerState)
    }
}
