package com.nirmaltag.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_pickups")
data class PendingPickupEntity(
    @PrimaryKey
    val localPickupId: String,           // UUID generated locally
    val idempotencyKey: String,          // UUID for RPC idempotency
    val tagSerialCode: String,           // QR Code serial (e.g. NT-SAN-2026-8012)
    val collectorId: String,             // Collector user sub
    val photoLocalUri: String,           // Local file URI on device storage
    val photoSha256: String,             // SHA-256 hash of image file for evidence verification
    val gpsLatitude: Double,             // GPS latitude at capture
    val gpsLongitude: Double,            // GPS longitude at capture
    val gpsAccuracyMeters: Float,        // GPS accuracy reading
    val capturedAtEpochMs: Long,         // Device timestamp of capture
    val aiStatus: String,                // VERIFIED, REJECTED, REVIEW_REQUIRED, or MODEL_UNAVAILABLE
    val aiConfidence: Float,             // Local model confidence (0.0f if MODEL_UNAVAILABLE)
    val aiInferenceMs: Long,             // Execution latency of local AI engine
    val state: OfflinePickupState,       // Current offline lifecycle state
    val serverPickupId: String? = null,  // Set when backend returns 200 response
    val serverErrorMessage: String? = null,
    val retryCount: Int = 0,
    val lastAttemptEpochMs: Long = 0L
)
