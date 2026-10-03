package com.nirmaltag.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface TagCacheDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateTag(tag: TagCacheEntity)

    @Query("SELECT * FROM tag_cache WHERE tagSerialCode = :tagSerialCode LIMIT 1")
    suspend fun getTagBySerial(tagSerialCode: String): TagCacheEntity?
}
