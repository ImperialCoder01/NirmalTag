package com.nirmaltag.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface PickupDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPickup(pickup: PendingPickupEntity)

    @Update
    suspend fun updatePickup(pickup: PendingPickupEntity)

    @Query("SELECT * FROM pending_pickups WHERE localPickupId = :localPickupId LIMIT 1")
    suspend fun getPickupById(localPickupId: String): PendingPickupEntity?

    @Query("SELECT * FROM pending_pickups ORDER BY capturedAtEpochMs DESC")
    fun getAllPickupsFlow(): Flow<List<PendingPickupEntity>>

    @Query("SELECT * FROM pending_pickups WHERE state IN ('LOCAL_CAPTURED', 'LOCAL_AI_COMPLETED', 'WAITING_FOR_NETWORK', 'SYNC_FAILED') ORDER BY capturedAtEpochMs ASC")
    suspend fun getUnsyncedPickups(): List<PendingPickupEntity>

    @Query("SELECT COUNT(*) FROM pending_pickups WHERE state IN ('LOCAL_CAPTURED', 'LOCAL_AI_COMPLETED', 'WAITING_FOR_NETWORK', 'SYNC_FAILED')")
    fun getPendingCountFlow(): Flow<Int>

    @Query("UPDATE pending_pickups SET state = :newState, serverErrorMessage = :errorMsg, retryCount = retryCount + 1, lastAttemptEpochMs = :attemptMs WHERE localPickupId = :localPickupId")
    suspend fun updateStateAndAttempt(localPickupId: String, newState: OfflinePickupState, errorMsg: String?, attemptMs: Long)

    @Query("UPDATE pending_pickups SET state = 'SERVER_VERIFIED', serverPickupId = :serverPickupId WHERE localPickupId = :localPickupId")
    suspend fun markVerified(localPickupId: String, serverPickupId: String)
}
