package zxtni.apixer.into.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import zxtni.apixer.into.data.AgentPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * BroadcastReceiver that tracks phone call state changes.
 * When a call ends, it sends the real-time webhook payload:
 *   {event_type, timestamp, sender_number, message_body: null, call_duration}
 *
 * Call states tracked: RINGING → OFFHOOK → IDLE
 *   - RINGING with incomingNumber → incoming call
 *   - OFFHOOK without prior ring  → outgoing call
 *   - IDLE after RINGING only     → missed call
 */
class CallReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallReceiver"

        // Static state to track call lifecycle across broadcasts
        private var lastState = TelephonyManager.CALL_STATE_IDLE
        private var callStartTime: Long = 0L
        private var isIncoming: Boolean = false
        private var savedNumber: String = ""
    }

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: savedNumber

        val state = when (stateStr) {
            TelephonyManager.EXTRA_STATE_RINGING -> TelephonyManager.CALL_STATE_RINGING
            TelephonyManager.EXTRA_STATE_OFFHOOK -> TelephonyManager.CALL_STATE_OFFHOOK
            TelephonyManager.EXTRA_STATE_IDLE -> TelephonyManager.CALL_STATE_IDLE
            else -> return
        }

        when {
            // ── Incoming call starts ringing ─────────────────
            state == TelephonyManager.CALL_STATE_RINGING -> {
                isIncoming = true
                savedNumber = number
                callStartTime = System.currentTimeMillis()
            }

            // ── Call answered (picked up) ────────────────────
            state == TelephonyManager.CALL_STATE_OFFHOOK && lastState != TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (!isIncoming) {
                    // Outgoing call
                    savedNumber = number
                }
                callStartTime = System.currentTimeMillis()
            }

            // ── Call ended ───────────────────────────────────
            state == TelephonyManager.CALL_STATE_IDLE && lastState != TelephonyManager.CALL_STATE_IDLE -> {
                val durationSec = if (callStartTime > 0) {
                    ((System.currentTimeMillis() - callStartTime) / 1000).toInt()
                } else 0

                val eventType = when {
                    lastState == TelephonyManager.CALL_STATE_RINGING -> "call_missed"
                    isIncoming -> "call_incoming"
                    else -> "call_outgoing"
                }

                sendCallEvent(context, eventType, savedNumber, durationSec)

                // Reset state
                isIncoming = false
                savedNumber = ""
                callStartTime = 0L
            }
        }

        lastState = state
    }

    private fun sendCallEvent(
        context: Context,
        eventType: String,
        phoneNumber: String,
        durationSec: Int,
    ) {
        val apiKey = AgentPreferences.getDeviceApiKey(context)
        if (apiKey.isBlank()) {
            Log.w(TAG, "No API key — skipping real-time call event")
            return
        }
        val serverUrl = AgentPreferences.getServerUrl(context)

        val payload = WebhookEventPayload(
            event_type = eventType,
            timestamp = isoFormat.format(Date()),
            sender_number = phoneNumber.ifBlank { "unknown" },
            message_body = null,
            call_duration = durationSec,
        )

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val body = json.encodeToString(payload)
                    .toRequestBody("application/json; charset=utf-8".toMediaType())

                val request = Request.Builder()
                    .url("$serverUrl/webhook/event")
                    .addHeader("X-API-Key", apiKey)
                    .post(body)
                    .build()

                OkHttpClient().newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        Log.i(TAG, "✅ Real-time call event ($eventType) sent: $phoneNumber, ${durationSec}s")
                    } else {
                        Log.e(TAG, "❌ Webhook failed: ${response.code}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Webhook error", e)
            }
        }
    }
}

