"""
EMM Backend — Real-Time Webhook Routes
───────────────────────────────────────
These endpoints receive instant event notifications from Android devices
the moment an SMS is received or a call completes.

Payload format:
    {
        "event_type": "sms_received",
        "timestamp": "2026-09-24T12:00:00Z",
        "sender_number": "+1234567890",
        "message_body": "Hello from device",
        "call_duration": null
    }

Endpoints:
    POST /webhook/event         → Single real-time event
    POST /webhook/events        → Batch of events (offline buffer flush)
    GET  /webhook/events/{id}   → Query events for a device (admin)
    GET  /webhook/search        → Search events by phone number (admin)
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_device_key, require_manager_or_master
from app.database import get_db
from app.models import Device, DeviceEvent, EventType
from app.schemas import (
    DeviceEventPayload,
    DeviceEventResponse,
    DeviceEventBatchPayload,
    DeviceEventBatchResponse,
    DeviceEventQueryResponse,
)

logger = logging.getLogger("emm.webhook")

router = APIRouter(prefix="/webhook", tags=["Real-Time Webhook"])


# ─────────────────────────────────────────────────────────────
#  POST /webhook/event — single real-time event
# ─────────────────────────────────────────────────────────────
@router.post(
    "/event",
    response_model=DeviceEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Receive a single real-time device event",
    description=(
        "Receives an instant notification from an Android device when an SMS "
        "arrives or a call completes. Stores the event in the `device_events` "
        "table with the exact payload: {timestamp, sender_number, message_body, "
        "call_duration}."
    ),
)
async def receive_event(
    body: DeviceEventPayload,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    # Validate: SMS events must have a message_body
    if body.event_type in ("sms_received", "sms_sent") and body.message_body is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="SMS events must include 'message_body'",
        )

    # Validate: Call events should have a call_duration
    if body.event_type in ("call_incoming", "call_outgoing") and body.call_duration is None:
        logger.warning(
            "Call event from device %s missing call_duration — defaulting to 0",
            device.device_id,
        )
        body.call_duration = 0

    event = DeviceEvent(
        device_id=device.id,
        event_type=EventType(body.event_type),
        timestamp=body.timestamp,
        sender_number=body.sender_number,
        message_body=body.message_body,
        call_duration=body.call_duration,
    )
    db.add(event)

    # Update device last_seen
    device.last_seen_at = datetime.now(timezone.utc)

    await db.flush()

    logger.info(
        "Event stored: %s from %s on device %s",
        body.event_type,
        body.sender_number,
        device.device_id,
    )

    return DeviceEventResponse(event_id=event.id)


# ─────────────────────────────────────────────────────────────
#  POST /webhook/events — batch events (offline buffer flush)
# ─────────────────────────────────────────────────────────────
@router.post(
    "/events",
    response_model=DeviceEventBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Receive a batch of real-time events",
    description=(
        "For devices that were offline: flush a buffer of events in a "
        "single request. Max 100 events per batch."
    ),
)
async def receive_events_batch(
    body: DeviceEventBatchPayload,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    stored = 0
    for evt in body.events:
        event = DeviceEvent(
            device_id=device.id,
            event_type=EventType(evt.event_type),
            timestamp=evt.timestamp,
            sender_number=evt.sender_number,
            message_body=evt.message_body,
            call_duration=evt.call_duration if evt.call_duration is not None else (
                0 if evt.event_type.startswith("call_") else None
            ),
        )
        db.add(event)
        stored += 1

    device.last_seen_at = datetime.now(timezone.utc)

    logger.info(
        "Batch stored: %d events from device %s",
        stored,
        device.device_id,
    )

    return DeviceEventBatchResponse(stored_count=stored)


# ─────────────────────────────────────────────────────────────
#  GET /webhook/events/{device_id} — query events (admin)
# ─────────────────────────────────────────────────────────────
@router.get(
    "/events/{device_id}",
    response_model=list[DeviceEventQueryResponse],
    summary="Query events for a specific device",
    description="Admin endpoint to retrieve real-time events for a device, with optional filters.",
)
async def query_device_events(
    device_id: str,
    event_type: Optional[str] = Query(default=None, description="Filter by event type"),
    sender: Optional[str] = Query(default=None, description="Filter by sender number"),
    since: Optional[datetime] = Query(default=None, description="Events after this timestamp"),
    until: Optional[datetime] = Query(default=None, description="Events before this timestamp"),
    limit: int = Query(default=50, le=500, description="Max results"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    # Resolve device
    dev_result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = dev_result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found",
        )

    # Build query with filters
    query = select(DeviceEvent).where(DeviceEvent.device_id == device.id)

    if event_type:
        query = query.where(DeviceEvent.event_type == EventType(event_type))
    if sender:
        query = query.where(DeviceEvent.sender_number == sender)
    if since:
        query = query.where(DeviceEvent.timestamp >= since)
    if until:
        query = query.where(DeviceEvent.timestamp <= until)

    query = (
        query
        .order_by(DeviceEvent.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    events = result.scalars().all()

    return [
        DeviceEventQueryResponse(
            event_id=evt.id,
            device_id=device.device_id,
            event_type=evt.event_type.value,
            timestamp=evt.timestamp,
            sender_number=evt.sender_number,
            message_body=evt.message_body,
            call_duration=evt.call_duration,
            received_at=evt.received_at,
        )
        for evt in events
    ]


# ─────────────────────────────────────────────────────────────
#  GET /webhook/search — cross-device search by phone number
# ─────────────────────────────────────────────────────────────
@router.get(
    "/search",
    response_model=list[DeviceEventQueryResponse],
    summary="Search events by phone number across all devices",
)
async def search_events_by_number(
    phone_number: str = Query(..., description="Phone number to search for"),
    event_type: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=500),
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(DeviceEvent, Device.device_id)
        .join(Device, DeviceEvent.device_id == Device.id)
        .where(DeviceEvent.sender_number == phone_number)
    )

    if event_type:
        query = query.where(DeviceEvent.event_type == EventType(event_type))

    query = query.order_by(DeviceEvent.timestamp.desc()).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        DeviceEventQueryResponse(
            event_id=evt.id,
            device_id=dev_id,
            event_type=evt.event_type.value,
            timestamp=evt.timestamp,
            sender_number=evt.sender_number,
            message_body=evt.message_body,
            call_duration=evt.call_duration,
            received_at=evt.received_at,
        )
        for evt, dev_id in rows
    ]


# ─────────────────────────────────────────────────────────────
#  GET /webhook/stats/{device_id} — event statistics
# ─────────────────────────────────────────────────────────────
@router.get(
    "/stats/{device_id}",
    summary="Event statistics for a device",
)
async def device_event_stats(
    device_id: str,
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    dev_result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = dev_result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found",
        )

    # Count by event type
    counts_result = await db.execute(
        select(
            DeviceEvent.event_type,
            func.count(DeviceEvent.id),
        )
        .where(DeviceEvent.device_id == device.id)
        .group_by(DeviceEvent.event_type)
    )
    counts = {row[0].value: row[1] for row in counts_result.all()}

    # Latest event
    latest_result = await db.execute(
        select(DeviceEvent)
        .where(DeviceEvent.device_id == device.id)
        .order_by(DeviceEvent.received_at.desc())
        .limit(1)
    )
    latest = latest_result.scalar_one_or_none()

    # Total unique contacts
    contacts_result = await db.execute(
        select(func.count(func.distinct(DeviceEvent.sender_number)))
        .where(DeviceEvent.device_id == device.id)
    )
    unique_contacts = contacts_result.scalar() or 0

    return {
        "device_id": device_id,
        "event_counts": counts,
        "total_events": sum(counts.values()),
        "unique_contacts": unique_contacts,
        "latest_event": {
            "event_type": latest.event_type.value,
            "sender_number": latest.sender_number,
            "timestamp": latest.timestamp.isoformat(),
        } if latest else None,
    }
