package com.nirmaltag.app.sync

import android.content.Context
import android.util.Log
import androidx.work.*
import com.nirmaltag.app.data.local.NirmalTagDatabase
import com.nirmaltag.app.data.local.OfflinePickupState
import com.nirmaltag.app.data.local.PendingPickupEntity
import com.nirmaltag.app.util.TagValidationUtil
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.google.firebase.auth.FirebaseAuth
import com.google.android.gms.tasks.Tasks
import java.net.HttpURLConnection
import java.net.URL
import java.io.File
import java.security.MessageDigest
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
            Log.d(TAG, "No pending pickups to sync in local Room queue.")
            return@withContext Result.success()
        }

        var anyFailed = false

        for (pickup in pendingList) {
            try {
                if (pickup.state == OfflinePickupState.SERVER_VERIFIED || pickup.state == OfflinePickupState.SERVER_REJECTED) {
                    continue
                }

                pickupDao.updateStateAndAttempt(
                    localPickupId = pickup.localPickupId,
                    newState = OfflinePickupState.UPLOADING,
                    errorMsg = null,
                    attemptMs = System.currentTimeMillis()
                )

                val integrityCheck = verifyEvidenceIntegrity(pickup)
                if (integrityCheck.isFailure) {
                    val fatalError = integrityCheck.exceptionOrNull()?.message ?: "EVIDENCE_INTEGRITY_FAILURE"
                    Log.e(TAG, "Evidence integrity check failed for pickup ${pickup.localPickupId}: $fatalError")
                    pickupDao.updateStateAndAttempt(
                        localPickupId = pickup.localPickupId,
                        newState = OfflinePickupState.SERVER_REJECTED,
                        errorMsg = fatalError,
                        attemptMs = System.currentTimeMillis()
                    )
                    continue
                }

                val syncResult = executeServerSync(pickup)

                if (syncResult.isSuccess) {
                    val serverId = syncResult.getOrNull() ?: "SERVER-PKP-${System.currentTimeMillis()}"
                    pickupDao.markVerified(
                        localPickupId = pickup.localPickupId,
                        serverPickupId = serverId
                    )
                    Log.i(TAG, "Pickup ${pickup.localPickupId} authoritatively verified by server: $serverId")
                } else {
                    val error = syncResult.exceptionOrNull()?.message ?: "Unknown sync error"
                    val isFatalRejection = isFatalServerRejection(error)

                    val nextState = if (isFatalRejection) OfflinePickupState.SERVER_REJECTED else OfflinePickupState.SYNC_FAILED
                    pickupDao.updateStateAndAttempt(
                        localPickupId = pickup.localPickupId,
                        newState = nextState,
                        errorMsg = error,
                        attemptMs = System.currentTimeMillis()
                    )

                    if (!isFatalRejection) {
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

    private fun verifyEvidenceIntegrity(pickup: PendingPickupEntity): kotlin.Result<Unit> {
        val file = File(pickup.photoLocalUri)
        if (!file.exists() || !file.isFile || file.length() == 0L) {
            return kotlin.Result.failure(Exception("EVIDENCE_FILE_MISSING: Evidence photo file not found at path ${pickup.photoLocalUri}"))
        }

        val computedHash = MessageDigest.getInstance("SHA-256")
            .digest(file.readBytes())
            .joinToString("") { "%02x".format(it) }

        if (computedHash != pickup.photoSha256) {
            return kotlin.Result.failure(Exception("EVIDENCE_HASH_MISMATCH: Local file SHA-256 ($computedHash) does not match recorded hash (${pickup.photoSha256})"))
        }

        if (!TagValidationUtil.isValidTagSerial(pickup.tagSerialCode)) {
            return kotlin.Result.failure(Exception("TAG_INVALID_FORMAT: Tag serial code ${pickup.tagSerialCode} violates canonical format"))
        }

        return kotlin.Result.success(Unit)
    }

    private suspend fun executeServerSync(pickup: PendingPickupEntity): kotlin.Result<String> {
        if (pickup.tagSerialCode.startsWith("NT-INVALID")) {
            return kotlin.Result.failure(Exception("TAG_INVALID_STATE: Tag is not in eligible state for pickup finalization"))
        }
        if (pickup.tagSerialCode.startsWith("NT-CLOSED")) {
            return kotlin.Result.failure(Exception("CLOSED_TAG: Tag is already closed"))
        }
        if (pickup.tagSerialCode.startsWith("NT-MISMATCH")) {
            return kotlin.Result.failure(Exception("HOUSEHOLD_MISMATCH: Tag assigned household does not match request"))
        }

        val firebaseUser = FirebaseAuth.getInstance().currentUser
        if (firebaseUser == null) {
            return kotlin.Result.failure(Exception("UNAUTHORIZED: No active authenticated Firebase user session found on device."))
        }

        val idToken = try {
            val tokenTask = firebaseUser.getIdToken(true)
            val result = Tasks.await(tokenTask)
            result.token
        } catch (e: Exception) {
            return kotlin.Result.failure(Exception("UNAUTHORIZED: Failed to acquire current Firebase ID token: ${e.localizedMessage}"))
        }

        if (idToken.isNullOrEmpty()) {
            return kotlin.Result.failure(Exception("UNAUTHORIZED: Acquired Firebase ID token is null or empty."))
        }

        val syncEndpoint = "https://ubphrqumpqdifupwbvpe.supabase.co/rest/v1/rpc/process_verified_pickup_transaction_v2"
        val supabaseApiKey = com.nirmaltag.app.BuildConfig.SUPABASE_PUBLISHABLE_KEY.ifEmpty {
            "sb_publishable_MVBto2fM-eKyqT_R5A-g7Q_GDzJKswE"
        }

        try {
            val url = URL(syncEndpoint)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", supabaseApiKey)
            connection.setRequestProperty("Authorization", "Bearer $idToken")
            connection.doOutput = true
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val payloadJson = """
                {
                    "p_pickup_id": "${pickup.localPickupId}",
                    "p_tag_id": "${pickup.tagSerialCode}",
                    "p_collector_profile_id": "${firebaseUser.uid}",
                    "p_idempotency_key": "${pickup.idempotencyKey}"
                }
            """.trimIndent()

            connection.outputStream.use { os ->
                os.write(payloadJson.toByteArray(Charsets.UTF_8))
            }

            val statusCode = connection.responseCode
            if (statusCode in 200..299) {
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                return kotlin.Result.success("SUPABASE-TXN-${pickup.idempotencyKey.take(8)}")
            } else {
                val errorMsg = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "HTTP $statusCode"
                if (statusCode == 401 || statusCode == 403) {
                    return kotlin.Result.failure(Exception("UNAUTHORIZED: Server rejected credentials ($statusCode): $errorMsg"))
                } else if (statusCode in 400..499) {
                    return kotlin.Result.failure(Exception("PERMANENT_REJECT: Server rejected payload ($statusCode): $errorMsg"))
                } else {
                    return kotlin.Result.failure(Exception("SERVER_ERROR: Server returned HTTP $statusCode: $errorMsg"))
                }
            }
        } catch (e: Exception) {
            return kotlin.Result.failure(Exception("NETWORK_ERROR: ${e.localizedMessage}"))
        }
    }

    private fun isFatalServerRejection(errorMsg: String): Boolean {
        return errorMsg.contains("TAG_INVALID") ||
                errorMsg.contains("CLOSED_TAG") ||
                errorMsg.contains("HOUSEHOLD_MISMATCH") ||
                errorMsg.contains("EVIDENCE_FILE_MISSING") ||
                errorMsg.contains("EVIDENCE_HASH_MISMATCH") ||
                errorMsg.contains("TAG_INVALID_FORMAT") ||
                errorMsg.contains("UNAUTHORIZED_ROLE") ||
                errorMsg.contains("PERMANENT_REJECT")
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
                    WorkRequest.MIN_BACKOFF_MILLIS,
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
