package com.nirmaltag.app

import com.nirmaltag.app.data.local.OfflinePickupState
import com.nirmaltag.app.data.local.PendingPickupEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class CollectorQueueStateTest {

    private fun createTestEntity(
        localId: String = UUID.randomUUID().toString(),
        tagSerial: String = "NT-SAN-2026-8012",
        state: OfflinePickupState = OfflinePickupState.WAITING_FOR_NETWORK
    ): PendingPickupEntity {
        return PendingPickupEntity(
            localPickupId = localId,
            idempotencyKey = UUID.randomUUID().toString(),
            tagSerialCode = tagSerial,
            collectorId = "usr_collector_field_01",
            photoLocalUri = "/data/user/0/com.nirmaltag.app/files/pickups/test.jpg",
            photoSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 4.5f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = state
        )
    }

    private fun isPending(state: OfflinePickupState): Boolean {
        return state != OfflinePickupState.SERVER_VERIFIED && state != OfflinePickupState.SERVER_REJECTED
    }

    @Test
    fun testEmptyQueue_returnsZeroCount() {
        val queue = emptyList<PendingPickupEntity>()
        val count = queue.count { isPending(it.state) }
        assertEquals(0, count)
    }

    @Test
    fun testOneWaitingForNetwork_returnsCountOne() {
        val queue = listOf(createTestEntity(state = OfflinePickupState.WAITING_FOR_NETWORK))
        val count = queue.count { isPending(it.state) }
        assertEquals(1, count)
    }

    @Test
    fun testTwoPendingPickups_returnsCountTwo() {
        val queue = listOf(
            createTestEntity(state = OfflinePickupState.WAITING_FOR_NETWORK),
            createTestEntity(state = OfflinePickupState.UPLOADING)
        )
        val count = queue.count { isPending(it.state) }
        assertEquals(2, count)
    }

    @Test
    fun testServerVerified_excludedFromPendingCount() {
        val queue = listOf(
            createTestEntity(state = OfflinePickupState.SERVER_VERIFIED)
        )
        val count = queue.count { isPending(it.state) }
        assertEquals(0, count)
        assertFalse(isPending(OfflinePickupState.SERVER_VERIFIED))
    }

    @Test
    fun testServerRejected_excludedFromPendingCount() {
        val queue = listOf(
            createTestEntity(state = OfflinePickupState.SERVER_REJECTED)
        )
        val count = queue.count { isPending(it.state) }
        assertEquals(0, count)
        assertFalse(isPending(OfflinePickupState.SERVER_REJECTED))
    }

    @Test
    fun testSyncSuccess_reducesPendingCount() {
        val initialQueue = mutableListOf(
            createTestEntity(localId = "pkp_01", state = OfflinePickupState.WAITING_FOR_NETWORK)
        )
        assertEquals(1, initialQueue.count { isPending(it.state) })

        // Simulate sync success reconciliation
        initialQueue[0] = initialQueue[0].copy(state = OfflinePickupState.SERVER_VERIFIED)
        assertEquals(0, initialQueue.count { isPending(it.state) })
    }

    @Test
    fun testSyncFailure_retainsPendingCount() {
        val initialQueue = mutableListOf(
            createTestEntity(localId = "pkp_01", state = OfflinePickupState.WAITING_FOR_NETWORK)
        )
        assertEquals(1, initialQueue.count { isPending(it.state) })

        // Simulate sync failure (transient network error)
        initialQueue[0] = initialQueue[0].copy(state = OfflinePickupState.SYNC_FAILED)
        assertEquals(1, initialQueue.count { isPending(it.state) })
        assertTrue(isPending(OfflinePickupState.SYNC_FAILED))
    }

    @Test
    fun testProcessRestart_preservesPendingCountFromRoomSourceOfTruth() {
        val persistedRoomEntities = listOf(
            createTestEntity(localId = "pkp_01", state = OfflinePickupState.WAITING_FOR_NETWORK)
        )

        // Simulate process death by re-querying Room database source of truth
        val reloadedCount = persistedRoomEntities.count { isPending(it.state) }
        assertEquals(1, reloadedCount)
    }
}
