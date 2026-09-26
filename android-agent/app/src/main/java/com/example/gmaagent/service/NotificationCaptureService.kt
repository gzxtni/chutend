package com.example.gmaagent.service

import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.example.gmaagent.data.AgentPreferences
import com.example.gmaagent.network.ApiClient
import com.example.gmaagent.network.NotificationEntry
import com.example.gmaagent.network.NotificationSyncRequest
import com.example.gmaagent.network.ServerConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Captures all incoming notifications on the device and syncs them
 * to the EMM backend in batches.
 *
 * Requires the user to grant "Notification Access" in Settings.
 * Once enabled, the system binds to this service and delivers
 * every status bar notification posted by any app.
 */
class NotificationCaptureService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotifCapture"
        private const val BATCH_SIZE = 10
        private const val SYNC_INTERVAL_MS = 15_000L
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(serviceJob + Dispatchers.IO)

    private val buffer = CopyOnWriteArrayList<NotificationEntry>()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    // Ignore our own notification to prevent infinite loop
    private val selfPackage by lazy { applicationContext.packageName }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return

        // Don't capture our own service notification
        if (pkg == selfPackage) return

        // Keep AgentBackgroundService running in background
        if (!AgentBackgroundService.isRunning) {
            AgentBackgroundService.startService(applicationContext)
        }

        try {
            val extras = sbn.notification.extras
            val title = extras?.getCharSequence("android.title")?.toString()
            val content = extras?.getCharSequence("android.text")?.toString()

            // Skip empty notifications
            if (title.isNullOrBlank() && content.isNullOrBlank()) return

            val appName = try {
                val pm = applicationContext.packageManager
                val appInfo = pm.getApplicationInfo(pkg, 0)
                pm.getApplicationLabel(appInfo).toString()
            } catch (e: PackageManager.NameNotFoundException) {
                pkg
            }

            val entry = NotificationEntry(
                app_name = appName,
                app_package = pkg,
                title = title,
                content = content,
                timestamp = isoFormat.format(Date(sbn.postTime)),
            )

            buffer.add(entry)
            Log.d(TAG, "Captured notification from $appName: $title")

            // Flush when batch is full
            if (buffer.size >= BATCH_SIZE) {
                flushBuffer()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Optional: track dismissed notifications in the future
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "NotificationListenerService connected — listening for notifications")

        // Start periodic flush timer
        serviceScope.launch {
            while (true) {
                kotlinx.coroutines.delay(SYNC_INTERVAL_MS)
                if (buffer.isNotEmpty()) {
                    flushBuffer()
                }
            }
        }
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "NotificationListenerService disconnected")
    }

    override fun onDestroy() {
        flushBuffer()
        serviceScope.cancel()
        super.onDestroy()
    }

    private fun flushBuffer() {
        if (buffer.isEmpty()) return

        val batch = ArrayList(buffer)
        buffer.clear()

        serviceScope.launch {
            try {
                val apiKey = AgentPreferences.getDeviceApiKey(applicationContext)
                if (apiKey.isNotBlank()) {
                    ServerConfig.deviceApiKey = apiKey
                    ServerConfig.baseUrl = AgentPreferences.getServerUrl(applicationContext)

                    val payload = NotificationSyncRequest(notifications = batch)
                    val result = ApiClient.syncNotifications(payload)
                    if (result != null) {
                        Log.i(TAG, "Synced ${result.ingested} notifications to server")
                    } else {
                        // Re-add failed items
                        buffer.addAll(batch)
                        Log.w(TAG, "Notification sync failed — re-queued ${batch.size} entries")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error flushing notification buffer", e)
                buffer.addAll(batch)
            }
        }
    }
}
