package com.example.gmaagent

import android.app.Application
import android.util.Log
import androidx.work.Configuration
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
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
     * With NetworkType.CONNECTED constraint, Android JobScheduler automatically wakes up
     * the app as soon as Mobile Data or WiFi connectivity is restored.
     */
    fun scheduleSyncWorker() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            15, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .addTag("emm_sync")
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            syncRequest,
        )

        Log.i(TAG, "Periodic sync worker watchdog with CONNECTED constraint scheduled (every 15 min)")
    }
}
