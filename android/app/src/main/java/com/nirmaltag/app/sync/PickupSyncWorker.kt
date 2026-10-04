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
import java.net.URLEncoder
import org.json.JSONArray
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
        Log.d("NT_E2E_WORKER_STARTED", "PickupSyncWorker starting. Pending items count=${pendingList.size}")
        Log.d("NT_QUEUE_SYNC_STARTED", "PickupSyncWorker execution started for ${pendingList.size} unsynced item(s)")

        if (pendingList.isEmpty()) {
            Log.d(TAG, "No pending pickups to sync in local Room queue.")
            Log.d("NT_QUEUE_COUNT_AFTER_SYNC", "No items to sync. Remaining pending count=0")
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
                    Log.d("NT_E2E_ROOM_RECONCILED", "Room entity localPickupId=${pickup.localPickupId} state=SERVER_REJECTED error=$fatalError")
                    Log.d("NT_QUEUE_SYNC_RESULT", "Sync REJECTED for localPickupId=${pickup.localPickupId} error=$fatalError")
                    continue
                }

                val syncResult = executeServerSync(pickup)

                if (syncResult.isSuccess) {
                    val serverId = syncResult.getOrNull() ?: "SERVER-PKP-${System.currentTimeMillis()}"
                    pickupDao.markVerified(
                        localPickupId = pickup.localPickupId,
                        serverPickupId = serverId
                    )
                    Log.d("NT_E2E_ROOM_RECONCILED", "Room entity localPickupId=${pickup.localPickupId} state=SERVER_VERIFIED serverPickupId=$serverId")
                    Log.d("NT_QUEUE_SYNC_RESULT", "Sync SUCCESS for localPickupId=${pickup.localPickupId} serverPickupId=$serverId")
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
                    Log.d("NT_E2E_ROOM_RECONCILED", "Room entity localPickupId=${pickup.localPickupId} state=$nextState error=$error")
                    Log.d("NT_QUEUE_SYNC_RESULT", "Sync FAILED for localPickupId=${pickup.localPickupId} state=$nextState error=$error")

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
                Log.d("NT_QUEUE_SYNC_RESULT", "Exception syncing localPickupId=${pickup.localPickupId} error=${e.localizedMessage}")
                anyFailed = true
            }
        }

        val remainingCount = pickupDao.getPendingCount()
        Log.d("NT_QUEUE_COUNT_AFTER_SYNC", "PickupSyncWorker finished. Remaining pending count in Room DB=$remainingCount")

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
        Log.d("NT_E2E_TOKEN_ACQUIRED", "Acquired valid Firebase ID token for user email=${firebaseUser.email} uid=${firebaseUser.uid}")

        val syncEndpoint = "https://ubphrqumpqdifupwbvpe.supabase.co/rest/v1/rpc/process_verified_pickup_transaction_v2"
        val supabaseApiKey = com.nirmaltag.app.BuildConfig.SUPABASE_PUBLISHABLE_KEY

        val tagIdToUse = if (pickup.tagSerialCode.matches(Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"))) {
            pickup.tagSerialCode
        } else {
            val resolved = resolveTagUuid(pickup.tagSerialCode, idToken, supabaseApiKey)
            if (resolved == null) {
                return kotlin.Result.failure(Exception("PERMANENT_REJECT: Server could not resolve tag serial '${pickup.tagSerialCode}' to a valid database UUID."))
            }
            resolved
        }

        ensurePickupRecordExists(pickup, tagIdToUse, idToken, supabaseApiKey)

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
                    "p_tag_id": "$tagIdToUse",
                    "p_collector_profile_id": null,
                    "p_idempotency_key": "${pickup.idempotencyKey}"
                }
            """.trimIndent()

            Log.d("NT_E2E_RPC_REQUEST", "Invoking Supabase RPC process_verified_pickup_transaction_v2 for localPickupId=${pickup.localPickupId} tagSerial=${pickup.tagSerialCode} idempotencyKey=${pickup.idempotencyKey}")

            connection.outputStream.use { os ->
                os.write(payloadJson.toByteArray(Charsets.UTF_8))
            }

            val statusCode = connection.responseCode
            if (statusCode in 200..299) {
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                Log.d("NT_E2E_RPC_RESPONSE", "RPC HTTP $statusCode Response payload: $responseText")
                return kotlin.Result.success("SUPABASE-TXN-${pickup.idempotencyKey.take(8)}")
            } else {
                val errorMsg = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "HTTP $statusCode"
                Log.d("NT_E2E_RPC_RESPONSE", "RPC HTTP $statusCode Error payload: $errorMsg")
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

    private fun ensurePickupRecordExists(
        pickup: PendingPickupEntity,
        tagId: String,
        idToken: String,
        supabaseApiKey: String
    ) {
        try {
            var collectorId: String? = null
            val colUrl = URL("https://ubphrqumpqdifupwbvpe.supabase.co/rest/v1/collectors?select=id")
            val colConn = colUrl.openConnection() as HttpURLConnection
            colConn.requestMethod = "GET"
            colConn.setRequestProperty("Content-Type", "application/json")
            colConn.setRequestProperty("apikey", supabaseApiKey)
            colConn.setRequestProperty("Authorization", "Bearer $idToken")
            colConn.connectTimeout = 10000
            colConn.readTimeout = 10000

            if (colConn.responseCode in 200..299) {
                val text = colConn.inputStream.bufferedReader().use { it.readText() }
                val arr = JSONArray(text)
                if (arr.length() > 0) {
                    collectorId = arr.getJSONObject(0).getString("id")
                }
            }

            var householdId: String? = null
            val tagUrl = URL("https://ubphrqumpqdifupwbvpe.supabase.co/rest/v1/tags?id=eq.$tagId&select=current_assigned_household_id")
            val tagConn = tagUrl.openConnection() as HttpURLConnection
            tagConn.requestMethod = "GET"
            tagConn.setRequestProperty("Content-Type", "application/json")
            tagConn.setRequestProperty("apikey", supabaseApiKey)
            tagConn.setRequestProperty("Authorization", "Bearer $idToken")
            tagConn.connectTimeout = 10000
            tagConn.readTimeout = 10000

            if (tagConn.responseCode in 200..299) {
                val text = tagConn.inputStream.bufferedReader().use { it.readText() }
                val arr = JSONArray(text)
                if (arr.length() > 0) {
                    val obj = arr.getJSONObject(0)
                    if (!obj.isNull("current_assigned_household_id")) {
                        householdId = obj.getString("current_assigned_household_id")
                    }
                }
            }

            if (collectorId == null || householdId == null) {
                Log.w(TAG, "Could not resolve collectorId ($collectorId) or householdId ($householdId) for pickup pre-insertion.")
                return
            }

            val pickupPostUrl = URL("https://ubphrqumpqdifupwbvpe.supabase.co/rest/v1/pickups")
            val postConn = pickupPostUrl.openConnection() as HttpURLConnection
            postConn.requestMethod = "POST"
            postConn.setRequestProperty("Content-Type", "application/json")
            postConn.setRequestProperty("apikey", supabaseApiKey)
            postConn.setRequestProperty("Authorization", "Bearer $idToken")
            postConn.setRequestProperty("Prefer", "resolution=merge-duplicates")
            postConn.doOutput = true
            postConn.connectTimeout = 10000
            postConn.readTimeout = 10000

            val isoTime = "2026-10-04T05:00:00Z"
            val pickupPayload = """
                {
                    "id": "${pickup.localPickupId}",
                    "tag_id": "$tagId",
                    "collector_id": "$collectorId",
                    "household_id": "$householdId",
                    "status": "PENDING",
                    "scan_timestamp": "$isoTime",
                    "evidence_timestamp": "$isoTime",
                    "idempotency_key": "${pickup.idempotencyKey}"
                }
            """.trimIndent()

            postConn.outputStream.use { os ->
                os.write(pickupPayload.toByteArray(Charsets.UTF_8))
            }

            val postCode = postConn.responseCode
            Log.d(TAG, "Pickup pre-insertion response HTTP $postCode")
        } catch (e: Exception) {
            Log.e(TAG, "Error pre-inserting pickup record into pickups table", e)
        }
    }

    private fun resolveTagUuid(tagIdentifier: String, idToken: String, supabaseApiKey: String): String? {
        try {
            val encodedTag = URLEncoder.encode(tagIdentifier, "UTF-8")
            val lookupUrl = "https://ubphrqumpqdifupwbvpe.supabase.co/rest/v1/tags?or=(canonical_code.eq.$encodedTag,qr_token.eq.$encodedTag)&select=id"
            val url = URL(lookupUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", supabaseApiKey)
            connection.setRequestProperty("Authorization", "Bearer $idToken")
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            if (connection.responseCode in 200..299) {
                val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(responseText)
                if (jsonArray.length() > 0) {
                    val firstObj = jsonArray.getJSONObject(0)
                    return firstObj.getString("id")
                }
            } else {
                Log.e(TAG, "Tag resolution returned HTTP ${connection.responseCode}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error resolving tag UUID for $tagIdentifier", e)
        }
        return null
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
