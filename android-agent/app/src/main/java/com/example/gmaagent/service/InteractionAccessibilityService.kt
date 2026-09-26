package com.example.gmaagent.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.example.gmaagent.data.AgentPreferences
import com.example.gmaagent.network.ApiClient
import com.example.gmaagent.network.InteractionEntry
import com.example.gmaagent.network.InteractionSyncRequest
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
 * Accessibility Service that captures user interactions on the screen:
 *   - Button clicks (TYPE_VIEW_CLICKED)
 *   - Text input changes (TYPE_VIEW_TEXT_CHANGED)
 *   - Scrolling (TYPE_VIEW_SCROLLED)
 *   - Long presses (TYPE_VIEW_LONG_CLICKED)
 *
 * Events are buffered and synced to the EMM backend in batches.
 *
 * The user must explicitly enable this service in
 * Settings > Accessibility > GMA Agent.
 */
class InteractionAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "InteractionA11y"
        private const val BATCH_SIZE = 25
        private const val SYNC_INTERVAL_MS = 20_000L
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(serviceJob + Dispatchers.IO)

    private val buffer = CopyOnWriteArrayList<InteractionEntry>()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_VIEW_CLICKED or
                    AccessibilityEvent.TYPE_VIEW_LONG_CLICKED or
                    AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_SCROLLED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            notificationTimeout = 100L
        }
        serviceInfo = info

        Log.i(TAG, "InteractionAccessibilityService connected — monitoring user interactions")

        // Start periodic flush
        serviceScope.launch {
            while (true) {
                kotlinx.coroutines.delay(SYNC_INTERVAL_MS)
                if (buffer.isNotEmpty()) {
                    flushBuffer()
                }
            }
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val interactionType = when (event.eventType) {
            AccessibilityEvent.TYPE_VIEW_CLICKED -> "click"
            AccessibilityEvent.TYPE_VIEW_LONG_CLICKED -> "long_press"
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> "text_input"
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> "scroll"
            else -> return
        }

        val targetText = event.text?.joinToString(" ")?.take(200) // Cap text length
        val targetClass = event.className?.toString()
        val appPackage = event.packageName?.toString()

        val entry = InteractionEntry(
            interaction_type = interactionType,
            target_text = if (targetText.isNullOrBlank()) null else targetText,
            target_class = targetClass,
            app_package = appPackage,
            x = null, // AccessibilityEvent doesn't provide touch coordinates
            y = null,
            timestamp = isoFormat.format(Date()),
        )

        buffer.add(entry)

        if (buffer.size >= BATCH_SIZE) {
            flushBuffer()
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "InteractionAccessibilityService interrupted")
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

                    val payload = InteractionSyncRequest(interactions = batch)
                    val result = ApiClient.syncInteractions(payload)
                    if (result != null) {
                        Log.i(TAG, "Synced ${result.ingested} interactions to server")
                    } else {
                        buffer.addAll(batch)
                        Log.w(TAG, "Interaction sync failed — re-queued ${batch.size} events")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error flushing interaction buffer", e)
                buffer.addAll(batch)
            }
        }
    }
}
