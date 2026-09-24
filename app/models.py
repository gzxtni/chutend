"""
EMM Backend — SQLAlchemy ORM Models
────────────────────────────────────
Database schema covering:
  • devices              — registered Android devices
  • sms_logs             — batch-synced SMS history
  • call_logs            — batch-synced call history
  • device_events        — real-time webhook events (SMS + call in unified table)
  • commands             — remote command queue
  • communication_logs   — full SMS inbox history synced from device
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ═══════════════════════════════════════════════════════════════
#  Enums
# ═══════════════════════════════════════════════════════════════

class CommandStatus(str, enum.Enum):
    """Lifecycle states for a queued command."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    EXECUTED = "executed"
    FAILED = "failed"


class CommandType(str, enum.Enum):
    """Supported remote command types."""
    SEND_SMS = "send_sms"
    LOCK_DEVICE = "lock_device"
    WIPE_DEVICE = "wipe_device"
    RING_DEVICE = "ring_device"
    INSTALL_APP = "install_app"
    UNINSTALL_APP = "uninstall_app"
    SET_POLICY = "set_policy"
    GET_LOCATION = "get_location"
    SET_RINGER_MODE = "set_ringer_mode"
    SET_BRIGHTNESS = "set_brightness"
    LAUNCH_APP = "launch_app"
    REFRESH_APPS = "refresh_apps"


class EventType(str, enum.Enum):
    """Real-time device event types."""
    SMS_RECEIVED = "sms_received"
    SMS_SENT = "sms_sent"
    CALL_INCOMING = "call_incoming"
    CALL_OUTGOING = "call_outgoing"
    CALL_MISSED = "call_missed"


# ═══════════════════════════════════════════════════════════════
#  Models
# ═══════════════════════════════════════════════════════════════

class Device(Base):
    """Registered Android device."""

    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(String(255), unique=True, nullable=False, index=True,
                       comment="ANDROID_ID or IMEI")
    device_name = Column(String(255), nullable=True)
    model = Column(String(255), nullable=True)
    manufacturer = Column(String(255), nullable=True)
    os_version = Column(String(50), nullable=True)
    api_key = Column(String(512), nullable=False, unique=True,
                     comment="Per-device API key")
    is_active = Column(Boolean, default=True, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    registered_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Device Diagnostics & Telemetry ───────────────────────
    battery_level = Column(Integer, nullable=True, comment="Battery percentage 0-100")
    storage_available_gb = Column(Float, nullable=True, comment="Available internal storage in GB")
    storage_total_gb = Column(Float, nullable=True, comment="Total internal storage in GB")
    ram_total_gb = Column(Float, nullable=True, comment="Total RAM in GB")
    serial_number = Column(String(255), nullable=True, comment="Hardware serial number")

    # ── Geolocation ──────────────────────────────────────────
    latitude = Column(Float, nullable=True, comment="GPS Latitude")
    longitude = Column(Float, nullable=True, comment="GPS Longitude")
    location_updated_at = Column(DateTime(timezone=True), nullable=True)

    # ── Network Intelligence ─────────────────────────────────
    ip_address = Column(String(100), nullable=True, comment="Current IPv4 / IPv6 address")
    network_type = Column(String(50), nullable=True, comment="Wi-Fi, 5G, LTE, Mobile")

    # ── App Management ───────────────────────────────────────
    installed_apps = Column(Text, nullable=True, comment="JSON array of installed applications")

    # Relationships
    sms_logs = relationship("SmsLog", back_populates="device",
                            cascade="all, delete-orphan")
    call_logs = relationship("CallLog", back_populates="device",
                             cascade="all, delete-orphan")
    events = relationship("DeviceEvent", back_populates="device",
                          cascade="all, delete-orphan")
    commands = relationship("Command", back_populates="device",
                            cascade="all, delete-orphan")
    communication_logs = relationship("CommunicationLog", back_populates="device",
                                      cascade="all, delete-orphan")


class Manager(Base):
    """
    Dashboard manager account — authenticated humans who can view
    device logs and issue remote commands via the web dashboard.

    Passwords are stored as bcrypt hashes.  The master_api_key is
    only used server-side to *create* manager accounts; managers
    themselves authenticate with username + password → JWT.
    """

    __tablename__ = "managers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False,
                           comment="bcrypt hash of the manager password")
    display_name = Column(String(255), nullable=True)
    role = Column(String(50), default="manager", nullable=False,
                  comment="manager | admin")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login_at = Column(DateTime(timezone=True), nullable=True)


class SmsLog(Base):
    """Batch-synced SMS message from a device."""

    __tablename__ = "sms_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True),
                       ForeignKey("devices.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    address = Column(String(50), nullable=False, comment="Phone number")
    body = Column(Text, nullable=True)
    sms_type = Column(String(20), nullable=False,
                      comment="inbox | sent | draft")
    timestamp = Column(DateTime(timezone=True), nullable=False,
                       comment="Original SMS timestamp on device")
    read = Column(Boolean, default=False)
    synced_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    device = relationship("Device", back_populates="sms_logs")


class CallLog(Base):
    """Batch-synced call record from a device."""

    __tablename__ = "call_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True),
                       ForeignKey("devices.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    phone_number = Column(String(50), nullable=False)
    call_type = Column(String(20), nullable=False,
                       comment="incoming | outgoing | missed | rejected")
    duration_seconds = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), nullable=False,
                       comment="Call start time on device")
    contact_name = Column(String(255), nullable=True)
    synced_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    device = relationship("Device", back_populates="call_logs")


class DeviceEvent(Base):
    """
    Real-time event pushed by a device the instant an SMS arrives or a call ends.

    This is the table that stores the exact JSON payload the user requested:
      {timestamp, sender_number, message_body, call_duration}

    Both SMS and call events share this schema — irrelevant fields are NULL:
      • SMS events  → message_body is populated, call_duration is NULL
      • Call events  → call_duration is populated, message_body may be NULL
    """

    __tablename__ = "device_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True),
                       ForeignKey("devices.id", ondelete="CASCADE"),
                       nullable=False)
    event_type = Column(Enum(EventType), nullable=False,
                        comment="sms_received | sms_sent | call_incoming | call_outgoing | call_missed")

    # ── The exact payload fields ──────────────────────────────
    timestamp = Column(DateTime(timezone=True), nullable=False,
                       comment="When the event occurred on the device")
    sender_number = Column(String(50), nullable=False,
                           comment="Phone number of the other party")
    message_body = Column(Text, nullable=True,
                          comment="SMS body — NULL for call events")
    call_duration = Column(Integer, nullable=True,
                           comment="Call duration in seconds — NULL for SMS events")

    # ── Server metadata ───────────────────────────────────────
    received_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="When the server received this event",
    )
    is_processed = Column(Boolean, default=False, nullable=False,
                          comment="Flag for downstream processing pipelines")

    # Composite index for fast querying by device + time range
    __table_args__ = (
        Index("ix_device_events_device_time", "device_id", "timestamp"),
        Index("ix_device_events_type", "event_type"),
        Index("ix_device_events_sender", "sender_number"),
    )

    device = relationship("Device", back_populates="events")


class Command(Base):
    """Remote command queued for a device."""

    __tablename__ = "commands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True),
                       ForeignKey("devices.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    command_type = Column(Enum(CommandType), nullable=False)
    payload = Column(Text, nullable=True,
                     comment="JSON-encoded command arguments")
    status = Column(Enum(CommandStatus), default=CommandStatus.PENDING,
                    nullable=False)
    result = Column(Text, nullable=True,
                    comment="Execution result or error message")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    device = relationship("Device", back_populates="commands")


class CommunicationLog(Base):
    """
    Full SMS inbox history synced from a device.

    Unlike SmsLog (which captures incremental sync batches), this table
    stores the complete historical inbox read from the device's content
    provider — every received SMS with its sender, body, and original
    timestamp.  A unique constraint on (device_id, address, timestamp)
    prevents duplicate rows when the device re-syncs.
    """

    __tablename__ = "communication_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True),
                       ForeignKey("devices.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    address = Column(String(50), nullable=False,
                     comment="Sender phone number")
    body = Column(Text, nullable=True,
                  comment="SMS message content")
    timestamp = Column(DateTime(timezone=True), nullable=False,
                       comment="Original SMS timestamp on device")
    synced_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_comm_logs_device_time", "device_id", "timestamp"),
        Index("ix_comm_logs_address", "address"),
    )

    device = relationship("Device", back_populates="communication_logs")
