package com.nirmaltag.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface AuthSessionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSession(session: AuthSessionEntity)

    @Query("SELECT * FROM auth_sessions ORDER BY lastLoginEpochMs DESC LIMIT 1")
    suspend fun getActiveSession(): AuthSessionEntity?

    @Query("DELETE FROM auth_sessions")
    suspend fun clearSessions()
}
