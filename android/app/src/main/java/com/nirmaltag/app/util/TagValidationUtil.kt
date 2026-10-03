package com.nirmaltag.app.util

object TagValidationUtil {
    private val TAG_REGEX = Regex("^NT-(SAN|HAZ|REC)-[0-9]{4}-[0-9]{4,8}$")

    fun isValidTagSerial(tagSerial: String): Boolean {
        if (tagSerial.isBlank()) return false
        if (tagSerial.startsWith("NT-INVALID")) return false
        return TAG_REGEX.matches(tagSerial.trim())
    }

    fun parseTagType(tagSerial: String): String {
        return when {
            tagSerial.contains("-SAN-") -> "SANITARY"
            tagSerial.contains("-HAZ-") -> "HAZARDOUS"
            tagSerial.contains("-REC-") -> "RECYCLABLE"
            else -> "UNKNOWN"
        }
    }
}
