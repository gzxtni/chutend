package com.example.gmaagent

import android.app.Application
import android.util.Log
import androidx.work.Configuration
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.example.gmaagent.service.AgentBackgroundService
import com.example.gmaagent.worker.SyncWorker
import java.util.concurrent.TimeUnit

/**
 * Application subclass that initializes WorkManager, schedules
 * the periodic sync worker watchdog, and launches the live background service.
 */
class GmaAgentApp : Application(), Configuration.Provider {

    companion object {
        const val TAG = "GmaAgentApp"
        const val SYNC_WORK_NAME = "emm_periodic_sync"
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(Log.DEBUG)
            .build()

    override fun onCreate() {
        super.onCreate()

        // 1. Start the always-active live sync service
        AgentBackgroundService.startService(this)

        // 2. Schedule WorkManager periodic watchdog
        scheduleSyncWorker()
    }

    /**
     * Enqueues a periodic sync worker that runs every 15 minutes as a fallback watchdog.
     */
    fun scheduleSyncWorker() {
        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            15, TimeUnit.MINUTES
        ).addTag("emm_sync")
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest,
        )

        Log.i(TAG, "Periodic sync worker watchdog scheduled (every 15 min)")
    }
}
