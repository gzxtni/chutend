package com.example.gmaagent.data

import android.content.Context
import android.database.Cursor
import android.provider.CallLog
import android.provider.Telephony
import android.util.Log
import com.example.gmaagent.network.CallEntry
import com.example.gmaagent.network.SmsEntry
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Reads SMS messages and call logs from the device's ContentProviders.
 * Requires READ_SMS and READ_CALL_LOG permissions.
 */
object DeviceDataReader {

    private const val TAG = "DeviceDataReader"
    private const val MAX_RECORDS = 200  // Cap per sync to avoid payload bloat

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    // ── SMS Reading ──────────────────────────────────────────

    /**
     * Reads the most recent SMS messages from the device.
     * @param context Application context
     * @param sinceTimestamp Only fetch messages newer than this epoch millis (0 = all)
     * @return List of [SmsEntry] ready for upload
     */
    fun readSmsLogs(context: Context, sinceTimestamp: Long = 0): List<SmsEntry> {
        val smsList = mutableListOf<SmsEntry>()
        var cursor: Cursor? = null

        try {
            val selection = if (sinceTimestamp > 0) "${Telephony.Sms.DATE} > ?" else null
            val selectionArgs = if (sinceTimestamp > 0) arrayOf(sinceTimestamp.toString()) else null

            cursor = context.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                arrayOf(
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.TYPE,
                    Telephony.Sms.DATE,
                    Telephony.Sms.READ,
                ),
                selection,
                selectionArgs,
                "${Telephony.Sms.DATE} DESC",
            )

            cursor?.let {
                val addressIdx = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyIdx = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val typeIdx = it.getColumnIndexOrThrow(Telephony.Sms.TYPE)
                val dateIdx = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
                val readIdx = it.getColumnIndexOrThrow(Telephony.Sms.READ)

                var count = 0
                while (it.moveToNext() && count < MAX_RECORDS) {
                    val address = it.getString(addressIdx) ?: "unknown"
                    val body = it.getString(bodyIdx)
                    val type = mapSmsType(it.getInt(typeIdx))
                    val date = it.getLong(dateIdx)
                    val read = it.getInt(readIdx) == 1

                    smsList.add(
                        SmsEntry(
                            address = address,
                            body = body,
                            sms_type = type,
                            timestamp = isoFormat.format(Date(date)),
                            read = read,
                        )
                    )
                    count++
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SMS permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading SMS", e)
        } finally {
            cursor?.close()
        }

        Log.i(TAG, "Read ${smsList.size} SMS messages")
        return smsList
    }

    private fun mapSmsType(type: Int): String = when (type) {
        Telephony.Sms.MESSAGE_TYPE_INBOX -> "inbox"
        Telephony.Sms.MESSAGE_TYPE_SENT -> "sent"
        Telephony.Sms.MESSAGE_TYPE_DRAFT -> "draft"
        else -> "inbox"
    }

    // ── Call Log Reading ─────────────────────────────────────

    /**
     * Reads the most recent call log entries from the device.
     * @param context Application context
     * @param sinceTimestamp Only fetch calls newer than this epoch millis (0 = all)
     * @return List of [CallEntry] ready for upload
     */
    fun readCallLogs(context: Context, sinceTimestamp: Long = 0): List<CallEntry> {
        val callList = mutableListOf<CallEntry>()
        var cursor: Cursor? = null

        try {
            val selection = if (sinceTimestamp > 0) "${CallLog.Calls.DATE} > ?" else null
            val selectionArgs = if (sinceTimestamp > 0) arrayOf(sinceTimestamp.toString()) else null

            cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.DATE,
                    CallLog.Calls.CACHED_NAME,
                ),
                selection,
                selectionArgs,
                "${CallLog.Calls.DATE} DESC",
            )

            cursor?.let {
                val numberIdx = it.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
                val typeIdx = it.getColumnIndexOrThrow(CallLog.Calls.TYPE)
                val durationIdx = it.getColumnIndexOrThrow(CallLog.Calls.DURATION)
                val dateIdx = it.getColumnIndexOrThrow(CallLog.Calls.DATE)
                val nameIdx = it.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)

                var count = 0
                while (it.moveToNext() && count < MAX_RECORDS) {
                    val number = it.getString(numberIdx) ?: "unknown"
                    val type = mapCallType(it.getInt(typeIdx))
                    val duration = it.getInt(durationIdx)
                    val date = it.getLong(dateIdx)
                    val name = it.getString(nameIdx)

                    callList.add(
                        CallEntry(
                            phone_number = number,
                            call_type = type,
                            duration_seconds = duration,
                            timestamp = isoFormat.format(Date(date)),
                            contact_name = name,
                        )
                    )
                    count++
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Call Log permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading Call Log", e)
        } finally {
            cursor?.close()
        }

        Log.i(TAG, "Read ${callList.size} call log entries")
        return callList
    }

    private fun mapCallType(type: Int): String = when (type) {
        CallLog.Calls.INCOMING_TYPE -> "incoming"
        CallLog.Calls.OUTGOING_TYPE -> "outgoing"
        CallLog.Calls.MISSED_TYPE -> "missed"
        CallLog.Calls.REJECTED_TYPE -> "rejected"
        else -> "incoming"
    }
}
