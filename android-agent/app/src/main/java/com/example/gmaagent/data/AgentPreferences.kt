package com.example.gmaagent.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/**
 * Lightweight SharedPreferences wrapper for persisting agent configuration:
 * - Server URL
 * - Device API key
 * - Last sync timestamps (for incremental sync)
 */
object AgentPreferences {

    private const val PREFS_NAME = "emm_agent_prefs"
    private const val KEY_SERVER_URL = "server_url"
    private const val KEY_DEVICE_API_KEY = "device_api_key"
    private const val KEY_LAST_SMS_SYNC = "last_sms_sync_timestamp"
    private const val KEY_LAST_CALL_SYNC = "last_call_sync_timestamp"
    private const val KEY_DEVICE_REGISTERED = "device_registered"
    private const val KEY_COMM_LOGS_SYNCED = "communication_logs_synced"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ── Server URL ───────────────────────────────────────────

    fun getServerUrl(context: Context): String =
        prefs(context).getString(KEY_SERVER_URL, "http://10.0.2.2:8000") ?: "http://10.0.2.2:8000"

    fun setServerUrl(context: Context, url: String) =
        prefs(context).edit { putString(KEY_SERVER_URL, url) }

    // ── Device API Key ───────────────────────────────────────

    fun getDeviceApiKey(context: Context): String =
        prefs(context).getString(KEY_DEVICE_API_KEY, "") ?: ""

    fun setDeviceApiKey(context: Context, key: String) =
        prefs(context).edit { putString(KEY_DEVICE_API_KEY, key) }

    // ── Registration flag ────────────────────────────────────

    fun isDeviceRegistered(context: Context): Boolean =
        prefs(context).getBoolean(KEY_DEVICE_REGISTERED, false)

    fun setDeviceRegistered(context: Context, registered: Boolean) =
        prefs(context).edit { putBoolean(KEY_DEVICE_REGISTERED, registered) }

    // ── Communication Logs synced flag ───────────────────────

    fun isCommLogsSynced(context: Context): Boolean =
        prefs(context).getBoolean(KEY_COMM_LOGS_SYNCED, false)

    fun setCommLogsSynced(context: Context, synced: Boolean) =
        prefs(context).edit { putBoolean(KEY_COMM_LOGS_SYNCED, synced) }

    // ── Last sync timestamps ─────────────────────────────────

    fun getLastSmsSyncTimestamp(context: Context): Long =
        prefs(context).getLong(KEY_LAST_SMS_SYNC, 0)

    fun setLastSmsSyncTimestamp(context: Context, ts: Long) =
        prefs(context).edit { putLong(KEY_LAST_SMS_SYNC, ts) }

    fun getLastCallSyncTimestamp(context: Context): Long =
        prefs(context).getLong(KEY_LAST_CALL_SYNC, 0)

    fun setLastCallSyncTimestamp(context: Context, ts: Long) =
        prefs(context).edit { putLong(KEY_LAST_CALL_SYNC, ts) }
}
