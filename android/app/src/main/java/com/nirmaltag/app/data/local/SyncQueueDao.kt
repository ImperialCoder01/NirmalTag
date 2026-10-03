package com.nirmaltag.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update

@Dao
interface SyncQueueDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueueItem(item: SyncQueueEntity)

    @Update
    suspend fun updateItem(item: SyncQueueEntity)

    @Query("SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY enqueuedAtEpochMs ASC")
    suspend fun getPendingQueueItems(): List<SyncQueueEntity>

    @Query("DELETE FROM sync_queue WHERE localPickupId = :localPickupId")
    suspend fun deleteByPickupId(localPickupId: String)
}
