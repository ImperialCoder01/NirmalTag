package com.nirmaltag.app.util

/**
 * TagValidationUtil provides client-side UX input validation only.
 * The backend Supabase database remains 100% authoritative for tag validity,
 * category assignment, and state transitions.
 */
object TagValidationUtil {
    // Client UX validation matching canonical tag codes (e.g. NT-SAN-2026-8012, NMT-2026-000001)
    private val TAG_REGEX = Regex("^(NT|NMT)(-(SAN|HAZ|REC))?-[0-9]{4}-[0-9]{4,8}$", RegexOption.IGNORE_CASE)

    fun isValidTagSerial(tagSerial: String): Boolean {
        if (tagSerial.isBlank()) return false
        if (tagSerial.startsWith("NT-INVALID", ignoreCase = true)) return false
        return TAG_REGEX.matches(tagSerial.trim())
    }

    fun parseTagTypeUX(tagSerial: String): String {
        return when {
            tagSerial.contains("-SAN-", ignoreCase = true) -> "SANITARY"
            tagSerial.contains("-HAZ-", ignoreCase = true) -> "HAZARDOUS"
            tagSerial.contains("-REC-", ignoreCase = true) -> "RECYCLABLE"
            else -> "SANITARY" // Default category; server database lookup provides authoritative waste_category_id
        }
    }
}
