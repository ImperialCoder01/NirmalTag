package com.nirmaltag.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [
        PendingPickupEntity::class,
        TagCacheEntity::class,
        SyncQueueEntity::class,
        AuthSessionEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class NirmalTagDatabase : RoomDatabase() {

    abstract fun pickupDao(): PickupDao
    abstract fun tagCacheDao(): TagCacheDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun authSessionDao(): AuthSessionDao

    companion object {
        @Volatile
        private var INSTANCE: NirmalTagDatabase? = null

        fun getDatabase(context: Context): NirmalTagDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    NirmalTagDatabase::class.java,
                    "nirmaltag_offline.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
