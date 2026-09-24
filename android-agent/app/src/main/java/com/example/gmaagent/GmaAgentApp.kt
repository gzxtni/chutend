package com.example.gmaagent

import android.app.Application
import android.util.Log
import androidx.work.Configuration
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.example.gmaagent.worker.SyncWorker
import java.util.concurrent.TimeUnit

/**
 * Application subclass that initializes WorkManager and schedules
 * the periodic sync worker on app start.
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
        scheduleSyncWorker()
    }

    /**
     * Enqueues a periodic sync worker that runs every 15 minutes (WorkManager minimum).
     * The actual sync interval target is ~5 minutes; we use the shortest allowed period
     * and rely on the server-side to handle idempotent/duplicate data gracefully.
     *
     * Note: WorkManager's minimum periodic interval is 15 minutes.
     * For sub-15-min intervals in production, consider using a foreground service
     * with a coroutine-based timer instead.
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

        Log.i(TAG, "Periodic sync worker scheduled (every 15 min)")
    }
}
