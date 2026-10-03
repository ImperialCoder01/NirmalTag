package com.nirmaltag.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tag_cache")
data class TagCacheEntity(
    @PrimaryKey
    val tagSerialCode: String,
    val batchId: String?,
    val assignedHouseholdId: String?,
    val tagType: String,             // SANITARY, HAZARDOUS, RECYCLABLE
    val lastKnownState: String,      // ISSUED, ATTACHED, VERIFIED, CLOSED, DISPUTED
    val cachedAtEpochMs: Long
)
