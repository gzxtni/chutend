package zxtni.apixer.into.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import zxtni.apixer.into.data.AgentPreferences
import zxtni.apixer.into.network.ApiClient
import zxtni.apixer.into.network.ServerConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
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
 * BroadcastReceiver that fires the instant an SMS is received.
 * Sends the real-time webhook payload to the server:
 *   {event_type, timestamp, sender_number, message_body, call_duration: null}
 *
 * Register in AndroidManifest.xml to receive SMS_RECEIVED broadcasts.
 */
class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
    }

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        // Load config
        val apiKey = AgentPreferences.getDeviceApiKey(context)
        if (apiKey.isBlank()) {
            Log.w(TAG, "No API key — skipping real-time SMS event")
            return
        }
        val serverUrl = AgentPreferences.getServerUrl(context)

        // Group message parts by sender (multi-part SMS)
        val grouped = messages.groupBy { it.originatingAddress ?: "unknown" }

        for ((sender, parts) in grouped) {
            val fullBody = parts.joinToString("") { it.messageBody ?: "" }
            val timestamp = isoFormat.format(Date(parts.first().timestampMillis))

            val payload = WebhookEventPayload(
                event_type = "sms_received",
                timestamp = timestamp,
                sender_number = sender,
                message_body = fullBody,
                call_duration = null,
            )

            // Fire-and-forget to the server
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
                            Log.i(TAG, "✅ Real-time SMS event sent for $sender")
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
}

/**
 * Matches the server's DeviceEventPayload schema exactly.
 */
@Serializable
data class WebhookEventPayload(
    val event_type: String,
    val timestamp: String,
    val sender_number: String,
    val message_body: String? = null,
    val call_duration: Int? = null,
)

