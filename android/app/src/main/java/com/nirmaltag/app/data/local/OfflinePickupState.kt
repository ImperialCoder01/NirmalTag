package com.nirmaltag.app.data.local

/**
 * OfflinePickupState tracks the lifecycle of an evidence-backed pickup capture on the Android client.
 * Server DB remains 100% authoritative; local states reflect synchronization status.
 */
enum class OfflinePickupState {
    LOCAL_CAPTURED,       // Image and QR tag saved to Room DB & disk
    LOCAL_AI_PENDING,     // Queued for local on-device visual evaluation
    LOCAL_AI_COMPLETED,   // Local AI visual feature vector extracted (or marked MODEL_UNAVAILABLE)
    WAITING_FOR_NETWORK,  // Saved locally, pending active network connection
    UPLOADING,            // Pickup payload being transmitted via WorkManager
    SERVER_PENDING,       // Received by backend, pending async validation
    SERVER_VERIFIED,      // Backend process_verified_pickup_transaction_v2 returned success (200)
    SERVER_REJECTED,      // Backend transaction failed (e.g. tag reused, invalid role, invalid transition)
    SYNC_FAILED           // Max retry attempts reached or fatal synchronization error
}
