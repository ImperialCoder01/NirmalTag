package com.nirmaltag.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.nirmaltag.app.data.local.NirmalTagDatabase
import com.nirmaltag.app.data.local.OfflinePickupState
import com.nirmaltag.app.data.local.PendingPickupEntity
import com.nirmaltag.app.util.TagValidationUtil
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class CollectorWorkflowInstrumentationTest {

    private lateinit var db: NirmalTagDatabase

    @Before
    fun setup() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        db = NirmalTagDatabase.getDatabase(appContext)
    }

    @Test
    fun testInstrumentationAppContext() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.nirmaltag.app", appContext.packageName)
    }

    @Test
    fun testRoomDatabaseInstrumentationInsertion() = runBlocking {
        val pickupId = UUID.randomUUID().toString()
        val idempotencyKey = UUID.randomUUID().toString()

        val entity = PendingPickupEntity(
            localPickupId = pickupId,
            idempotencyKey = idempotencyKey,
            tagSerialCode = "NT-SAN-2026-8012",
            collectorId = "col_instr_01",
            photoLocalUri = "/data/user/0/com.nirmaltag.app/files/pickups/instr_photo.jpg",
            photoSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            gpsLatitude = 28.5355,
            gpsLongitude = 77.2610,
            gpsAccuracyMeters = 3.0f,
            capturedAtEpochMs = System.currentTimeMillis(),
            aiStatus = "MODEL_UNAVAILABLE",
            aiConfidence = 0.0f,
            aiInferenceMs = 0L,
            state = OfflinePickupState.WAITING_FOR_NETWORK
        )

        db.pickupDao().insertPickup(entity)

        val fetched = db.pickupDao().getPickupById(pickupId)
        assertNotNull(fetched)
        assertEquals(pickupId, fetched?.localPickupId)
        assertEquals(idempotencyKey, fetched?.idempotencyKey)
        assertEquals(OfflinePickupState.WAITING_FOR_NETWORK, fetched?.state)
    }

    @Test
    fun testTagValidationUtilInInstrumentation() {
        assertTrue(TagValidationUtil.isValidTagSerial("NT-SAN-2026-8012"))
        assertFalse(TagValidationUtil.isValidTagSerial("NT-INVALID-999"))
    }
}
