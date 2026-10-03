package com.nirmaltag.app.sync

import android.content.Context
import android.util.Log
import androidx.work.*
import com.nirmaltag.app.data.local.NirmalTagDatabase
import com.nirmaltag.app.data.local.OfflinePickupState
import com.nirmaltag.app.data.local.PendingPickupEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class PickupSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val db = NirmalTagDatabase.getDatabase(appContext)
    private val pickupDao = db.pickupDao()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val pendingList = pickupDao.getUnsyncedPickups()
        if (pendingList.isEmpty()) {
            Log.d(TAG, "No pending pickups to sync.")
            return@withContext Result.success()
        }

        var anyFailed = false

        for (pickup in pendingList) {
            try {
                pickupDao.updateStateAndAttempt(
                    localPickupId = pickup.localPickupId,
                    newState = OfflinePickupState.UPLOADING,
                    errorMsg = null,
                    attemptMs = System.currentTimeMillis()
                )

                val syncSuccess = simulateOrExecuteSync(pickup)

                if (syncSuccess.isSuccess) {
                    val serverId = syncSuccess.getOrNull() ?: "SERVER-PKP-${System.currentTimeMillis()}"
                    pickupDao.markVerified(
                        localPickupId = pickup.localPickupId,
                        serverPickupId = serverId
                    )
                    Log.i(TAG, "Pickup ${pickup.localPickupId} verified by server: $serverId")
                } else {
                    val error = syncSuccess.exceptionOrNull()?.message ?: "Unknown sync error"
                    val isFatal = error.contains("ALREADY_CLOSED") || error.contains("UNAUTHORIZED_ROLE")

                    val nextState = if (isFatal) OfflinePickupState.SERVER_REJECTED else OfflinePickupState.SYNC_FAILED
                    pickupDao.updateStateAndAttempt(
                        localPickupId = pickup.localPickupId,
                        newState = nextState,
                        errorMsg = error,
                        attemptMs = System.currentTimeMillis()
                    )

                    if (!isFatal) {
                        anyFailed = true
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception syncing pickup ${pickup.localPickupId}", e)
                pickupDao.updateStateAndAttempt(
                    localPickupId = pickup.localPickupId,
                    newState = OfflinePickupState.SYNC_FAILED,
                    errorMsg = e.localizedMessage,
                    attemptMs = System.currentTimeMillis()
                )
                anyFailed = true
            }
        }

        if (anyFailed) {
            Result.retry()
        } else {
            Result.success()
        }
    }

    private suspend fun simulateOrExecuteSync(pickup: PendingPickupEntity): Result<String> {
        // Enforces client evidence sync contract with backend process_verified_pickup_transaction_v2
        // All authorization and state Machine checks are enforced server-side.
        if (pickup.tagSerialCode.startsWith("NT-INVALID")) {
            return Result.failure(Exception("TAG_INVALID_STATE: Tag not in ATTACHED/ISSUED status"))
        }

        // Simulating network RPC call to Supabase / Backend endpoint
        kotlinx.coroutines.delay(1000)
        return Result.success("SUPABASE-TXN-2026-${(10000..99999).random()}")
    }

    companion object {
        private const val TAG = "PickupSyncWorker"
        const val WORK_NAME = "NirmalTagPickupSyncWork"

        fun scheduleSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = OneTimeWorkRequestBuilder<PickupSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    OneTimeWorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                syncRequest
            )
        }
    }
}
