package com.nirmaltag.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "auth_sessions")
data class AuthSessionEntity(
    @PrimaryKey
    val userId: String,               // Firebase Auth UID
    val email: String,
    val activeRole: String,           // UserRoleType name
    val cachedIdToken: String?,       // Encrypted or session-scoped ID Token
    val tokenExpiresAtMs: Long,       // Epoch timestamp of token expiration
    val lastLoginEpochMs: Long
)
