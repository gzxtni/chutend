"""
EMM Backend — Pydantic Request / Response Schemas
──────────────────────────────────────────────────
Validates all inbound payloads and shapes outbound responses.
Includes both batch-sync schemas and real-time webhook schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════
#  Device Registration
# ═══════════════════════════════════════════════════════════════

class DeviceRegisterRequest(BaseModel):
    """Payload sent by a device when first registering."""
    device_id: str = Field(..., max_length=255, description="ANDROID_ID or IMEI")
    device_name: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    os_version: Optional[str] = None


class DeviceRegisterResponse(BaseModel):
    """Returned after successful registration — contains the device's API key."""
    id: uuid.UUID
    device_id: str
    api_key: str
    message: str = "Device registered successfully"


class DeviceInfoResponse(BaseModel):
    """Public device info with diagnostics, geolocation, and network telemetry."""
    id: uuid.UUID
    device_id: str
    device_name: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    os_version: Optional[str] = None
    is_active: bool
    last_seen_at: Optional[datetime] = None
    registered_at: datetime

    # Diagnostics & Hardware
    battery_level: Optional[int] = None
    storage_available_gb: Optional[float] = None
    storage_total_gb: Optional[float] = None
    ram_total_gb: Optional[float] = None
    serial_number: Optional[str] = None

    # Geolocation
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_updated_at: Optional[datetime] = None

    # Network & Telephony Intelligence
    ip_address: Optional[str] = None
    network_type: Optional[str] = None
    phone_number: Optional[str] = None
    sim_1: Optional[str] = None
    sim_2: Optional[str] = None

    # App Management
    installed_apps: Optional[str] = None

    # Active Application
    foreground_app: Optional[str] = None
    foreground_app_package: Optional[str] = None

    # Connection Quality
    signal_strength: Optional[int] = None
    network_latency_ms: Optional[int] = None

    class Config:
        from_attributes = True


class AppItem(BaseModel):
    name: str
    package: str
    version: Optional[str] = None
    is_system: Optional[bool] = False


class DeviceTelemetryPayload(BaseModel):
    """Device sends periodic diagnostics, GPS location, network intel, and foreground app."""
    battery_level: Optional[int] = Field(None, ge=0, le=100)
    storage_available_gb: Optional[float] = None
    storage_total_gb: Optional[float] = None
    ram_total_gb: Optional[float] = None
    serial_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ip_address: Optional[str] = None
    network_type: Optional[str] = None
    installed_apps: Optional[list[AppItem]] = None
    phone_number: Optional[str] = None
    sim_1: Optional[str] = None
    sim_2: Optional[str] = None
    foreground_app: Optional[str] = None
    foreground_app_package: Optional[str] = None
    signal_strength: Optional[int] = None
    network_latency_ms: Optional[int] = None


# ═══════════════════════════════════════════════════════════════
#  Real-Time Webhook — Device Events
#  Exact JSON: {timestamp, sender_number, message_body, call_duration}
# ═══════════════════════════════════════════════════════════════

class DeviceEventPayload(BaseModel):
    """
    The exact JSON payload sent by an Android device the instant
    an SMS is received or a call completes.

    Example SMS event:
        {
            "event_type": "sms_received",
            "timestamp": "2026-09-24T12:00:00Z",
            "sender_number": "+1234567890",
            "message_body": "Hello from the device",
            "call_duration": null
        }

    Example Call event:
        {
            "event_type": "call_incoming",
            "timestamp": "2026-09-24T12:30:00Z",
            "sender_number": "+1234567890",
            "message_body": null,
            "call_duration": 120
        }
    """
    event_type: str = Field(
        ...,
        pattern="^(sms_received|sms_sent|call_incoming|call_outgoing|call_missed)$",
        description="Type of event",
    )
    timestamp: datetime = Field(
        ...,
        description="When the event occurred on the device (ISO-8601)",
    )
    sender_number: str = Field(
        ...,
        max_length=50,
        description="Phone number of the other party",
    )
    message_body: Optional[str] = Field(
        default=None,
        description="SMS message body — null for call events",
    )
    call_duration: Optional[int] = Field(
        default=None,
        ge=0,
        description="Call duration in seconds — null for SMS events",
    )


class DeviceEventResponse(BaseModel):
    """Returned after an event is stored."""
    event_id: uuid.UUID
    status: str = "stored"
    message: str = "Event received and stored successfully"


class DeviceEventBatchPayload(BaseModel):
    """Batch of real-time events (for buffered offline scenarios)."""
    events: list[DeviceEventPayload] = Field(
        ..., min_length=1, max_length=100,
    )


class DeviceEventBatchResponse(BaseModel):
    """Returned after batch events are stored."""
    stored_count: int
    status: str = "ok"
    message: str = "Events batch stored successfully"


class DeviceEventQueryResponse(BaseModel):
    """Single event returned in query results."""
    event_id: uuid.UUID
    device_id: str
    event_type: str
    timestamp: datetime
    sender_number: str
    message_body: Optional[str]
    call_duration: Optional[int]
    received_at: datetime


# ═══════════════════════════════════════════════════════════════
#  Batch Sync — SMS
# ═══════════════════════════════════════════════════════════════

class SmsEntry(BaseModel):
    """Single SMS record inside a sync payload."""
    address: str = Field(..., max_length=50, description="Phone number")
    body: Optional[str] = None
    sms_type: str = Field(..., pattern="^(inbox|sent|draft)$")
    timestamp: datetime
    read: bool = False


class SmsSyncRequest(BaseModel):
    """Batch of SMS records from a device."""
    sms_messages: list[SmsEntry] = Field(..., min_length=1, max_length=500)


# ═══════════════════════════════════════════════════════════════
#  Batch Sync — Call Logs
# ═══════════════════════════════════════════════════════════════

class CallEntry(BaseModel):
    """Single call record inside a sync payload."""
    phone_number: str = Field(..., max_length=50)
    call_type: str = Field(..., pattern="^(incoming|outgoing|missed|rejected)$")
    duration_seconds: int = Field(default=0, ge=0)
    timestamp: datetime
    contact_name: Optional[str] = None


class CallSyncRequest(BaseModel):
    """Batch of call records from a device."""
    call_logs: list[CallEntry] = Field(..., min_length=1, max_length=500)


# ═══════════════════════════════════════════════════════════════
#  Batch Sync — Combined
# ═══════════════════════════════════════════════════════════════

class DeviceSyncRequest(BaseModel):
    """Combined sync payload — device sends SMS and/or call logs."""
    sms_messages: Optional[list[SmsEntry]] = Field(default=None, max_length=500)
    call_logs: Optional[list[CallEntry]] = Field(default=None, max_length=500)


class SyncAckResponse(BaseModel):
    """Acknowledgement returned after a successful sync."""
    status: str = "ok"
    sms_ingested: int = 0
    calls_ingested: int = 0
    pending_commands: int = 0
    message: str = "Sync successful"


# ═══════════════════════════════════════════════════════════════
#  Execute Command
# ═══════════════════════════════════════════════════════════════

class ExecuteCommandRequest(BaseModel):
    """Admin dispatches a command to a target device."""
    device_id: str = Field(..., description="Target device ANDROID_ID or IMEI")
    command_type: str = Field(
        ...,
        pattern="^(?i)(send_sms|lock_device|wipe_device|ring_device|install_app|uninstall_app|set_policy|get_location|set_ringer_mode|set_brightness|launch_app|refresh_apps|take_screenshot)$",
    )
    payload: Optional[dict[str, Any]] = Field(default=None)


class CommandResponse(BaseModel):
    """Returned after a command is queued."""
    command_id: uuid.UUID
    device_id: str
    command_type: str
    status: str
    message: str = "Command queued successfully"


class CommandStatusUpdate(BaseModel):
    """Sent by device to update command execution status."""
    command_id: uuid.UUID
    status: str = Field(..., pattern="^(delivered|executed|failed)$")
    result: Optional[str] = None


class PendingCommandResponse(BaseModel):
    """Pending command returned to a device during poll."""
    command_id: uuid.UUID
    command_type: str
    payload: Optional[str]
    created_at: datetime


# ═══════════════════════════════════════════════════════════════
#  Manager Authentication
# ═══════════════════════════════════════════════════════════════

class ManagerLoginRequest(BaseModel):
    """Credentials for manager login."""
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)


class ManagerLoginResponse(BaseModel):
    """Returned after successful login — contains a JWT."""
    access_token: str
    token_type: str = "bearer"
    expires_in_hours: int
    manager: "ManagerProfileResponse"


class ManagerCreateRequest(BaseModel):
    """Admin creates a new manager account (requires master key)."""
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: Optional[str] = None
    role: str = Field(default="manager", pattern="^(manager|admin)$")


class ManagerProfileResponse(BaseModel):
    """Public manager profile info."""
    id: uuid.UUID
    username: str
    display_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
#  Communication Logs — Full SMS inbox history
# ═══════════════════════════════════════════════════════════════

class CommunicationLogEntry(BaseModel):
    """Single received-SMS record for the Communication Logs bulk sync."""
    address: str = Field(..., max_length=50, description="Sender phone number")
    body: Optional[str] = Field(default=None, description="SMS message content")
    timestamp: datetime = Field(..., description="Original SMS timestamp on device (ISO-8601)")


class CommunicationLogSyncRequest(BaseModel):
    """Batch of received-SMS records from a device's full inbox history."""
    logs: list[CommunicationLogEntry] = Field(
        ..., min_length=1, max_length=1000,
        description="List of communication log entries",
    )


class CommunicationLogSyncResponse(BaseModel):
    """Acknowledgement returned after communication logs are ingested."""
    status: str = "ok"
    logs_ingested: int = 0
    duplicates_skipped: int = 0
    message: str = "Communication logs synced successfully"


class CommunicationLogQueryResponse(BaseModel):
    """Single communication log entry returned in query results."""
    id: uuid.UUID
    device_id: str
    address: str
    body: Optional[str]
    timestamp: datetime
    synced_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
#  Generic
# ═══════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """Standard error envelope."""
    detail: str


# ═══════════════════════════════════════════════════════════════
#  Monitoring — Notifications
# ═══════════════════════════════════════════════════════════════

class NotificationEntry(BaseModel):
    """Single captured notification from device."""
    app_name: str = Field(..., max_length=255)
    app_package: str = Field(..., max_length=255)
    title: Optional[str] = None
    content: Optional[str] = None
    timestamp: datetime


class NotificationSyncRequest(BaseModel):
    """Batch of captured notifications from device."""
    notifications: list[NotificationEntry] = Field(..., min_length=1, max_length=200)


class NotificationSyncResponse(BaseModel):
    """Acknowledgement after notifications are ingested."""
    status: str = "ok"
    ingested: int = 0
    message: str = "Notifications synced successfully"


class NotificationQueryResponse(BaseModel):
    """Single notification in query results."""
    id: uuid.UUID
    app_name: str
    app_package: str
    title: Optional[str]
    content: Optional[str]
    timestamp: datetime
    received_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
#  Monitoring — User Interactions
# ═══════════════════════════════════════════════════════════════

class InteractionEntry(BaseModel):
    """Single user interaction event from device."""
    interaction_type: str = Field(..., max_length=50)
    target_text: Optional[str] = None
    target_class: Optional[str] = None
    app_package: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    timestamp: datetime


class InteractionSyncRequest(BaseModel):
    """Batch of interaction events from device."""
    interactions: list[InteractionEntry] = Field(..., min_length=1, max_length=500)


class InteractionSyncResponse(BaseModel):
    """Acknowledgement after interactions are ingested."""
    status: str = "ok"
    ingested: int = 0
    message: str = "Interactions synced successfully"


class InteractionQueryResponse(BaseModel):
    """Single interaction in query results."""
    id: uuid.UUID
    interaction_type: str
    target_text: Optional[str]
    target_class: Optional[str]
    app_package: Optional[str]
    x: Optional[float]
    y: Optional[float]
    timestamp: datetime
    received_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
#  Monitoring — Screenshots
# ═══════════════════════════════════════════════════════════════

class ScreenshotUploadRequest(BaseModel):
    """Device uploads a captured screenshot."""
    image_base64: str = Field(..., description="Base64-encoded JPEG image")
    captured_at: datetime


class ScreenshotResponse(BaseModel):
    """Screenshot query response."""
    id: uuid.UUID
    image_data: str
    captured_at: datetime
    received_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
#  Media Library Explorer
# ═══════════════════════════════════════════════════════════════

class MediaThumbnailEntry(BaseModel):
    """A single media thumbnail uploaded from the device gallery."""
    media_store_id: str = Field(..., description="MediaStore content URI or unique ID")
    media_type: str = Field("image", description="image | video")
    file_name: Optional[str] = None
    file_size: Optional[int] = Field(None, description="Original file size in bytes")
    width: Optional[int] = None
    height: Optional[int] = None
    duration_ms: Optional[int] = Field(None, description="Video duration in ms")
    mime_type: Optional[str] = None
    date_taken: Optional[datetime] = None
    thumbnail_b64: str = Field(..., description="Base64-encoded compressed JPEG thumbnail <50KB")


class MediaThumbnailSyncRequest(BaseModel):
    """Batch upload of gallery thumbnails from device."""
    thumbnails: list[MediaThumbnailEntry] = Field(..., min_length=1)


class MediaThumbnailSyncResponse(BaseModel):
    """Acknowledgement after thumbnails are ingested."""
    status: str = "ok"
    ingested: int = 0
    skipped: int = 0
    message: str = "Thumbnails synced successfully"


class MediaItemResponse(BaseModel):
    """Gallery media item for dashboard display."""
    id: uuid.UUID
    media_store_id: str
    media_type: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_ms: Optional[int] = None
    mime_type: Optional[str] = None
    date_taken: Optional[datetime] = None
    thumbnail_b64: str
    has_full_file: bool = False
    synced_at: datetime

    class Config:
        from_attributes = True


class MediaFullFileUploadRequest(BaseModel):
    """Device uploads a full-resolution media file."""
    media_store_id: str = Field(..., description="Matching media_store_id from thumbnail sync")
    file_data: str = Field(..., description="Base64-encoded full-resolution file")
    mime_type: Optional[str] = None


class MediaFullFileResponse(BaseModel):
    """Full-resolution file response."""
    id: uuid.UUID
    file_data: str
    mime_type: Optional[str] = None
    fetched_at: datetime

    class Config:
        from_attributes = True

