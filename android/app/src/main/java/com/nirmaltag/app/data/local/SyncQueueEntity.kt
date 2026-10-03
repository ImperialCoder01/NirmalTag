package com.nirmaltag.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey
    val queueId: String,
    val localPickupId: String,
    val enqueuedAtEpochMs: Long,
    val status: String,               // PENDING, IN_FLIGHT, SUCCESS, FAILED, RETRYING
    val attempts: Int = 0,
    val lastError: String? = null
)
