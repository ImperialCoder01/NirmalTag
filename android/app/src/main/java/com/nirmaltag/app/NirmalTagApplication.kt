package com.nirmaltag.app

import android.app.Application

class NirmalTagApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize global offline queue & security contexts
    }
}
