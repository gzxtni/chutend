"""
EMM Backend — Device Sync Routes (Device_Sync)
───────────────────────────────────────────────
POST /sync/data             → Receive batch SMS + Call logs from a device
GET  /sync/pending-commands → Device polls for queued commands
POST /sync/command-status   → Device reports command execution result
GET  /sync/sms-logs/{id}    → Admin queries batch-synced SMS logs
GET  /sync/call-logs/{id}   → Admin queries batch-synced call logs
"""

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_device_key, require_manager_or_master
from app.database import get_db
from app.models import CallLog, Command, CommandStatus, Device, SmsLog
from app.schemas import (
    CommandStatusUpdate,
    DeviceSyncRequest,
    DeviceTelemetryPayload,
    PendingCommandResponse,
    SyncAckResponse,
)

router = APIRouter(prefix="/sync", tags=["Device Sync"])


@router.post(
    "/data",
    response_model=SyncAckResponse,
    summary="Sync SMS & call logs from device (batch)",
)
async def device_sync(
    body: DeviceSyncRequest,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    if not body.sms_messages and not body.call_logs:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one of 'sms_messages' or 'call_logs' must be provided",
        )

    sms_count = 0
    call_count = 0

    if body.sms_messages:
        sms_objects = [
            SmsLog(
                device_id=device.id,
                address=sms.address,
                body=sms.body,
                sms_type=sms.sms_type,
                timestamp=sms.timestamp,
                read=sms.read,
            )
            for sms in body.sms_messages
        ]
        db.add_all(sms_objects)
        sms_count = len(sms_objects)

    if body.call_logs:
        call_objects = [
            CallLog(
                device_id=device.id,
                phone_number=call.phone_number,
                call_type=call.call_type,
                duration_seconds=call.duration_seconds,
                timestamp=call.timestamp,
                contact_name=call.contact_name,
            )
            for call in body.call_logs
        ]
        db.add_all(call_objects)
        call_count = len(call_objects)

    device.last_seen_at = datetime.now(timezone.utc)

    pending = await db.execute(
        select(func.count(Command.id)).where(
            Command.device_id == device.id,
            Command.status == CommandStatus.PENDING,
        )
    )
    pending_count = pending.scalar() or 0

    return SyncAckResponse(
        sms_ingested=sms_count,
        calls_ingested=call_count,
        pending_commands=pending_count,
    )


@router.post(
    "/telemetry",
    summary="Update device diagnostics, GPS coordinates, network intelligence, and apps",
)
async def update_device_telemetry(
    body: DeviceTelemetryPayload,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    if body.battery_level is not None:
        device.battery_level = body.battery_level
    if body.storage_available_gb is not None:
        device.storage_available_gb = body.storage_available_gb
    if body.storage_total_gb is not None:
        device.storage_total_gb = body.storage_total_gb
    if body.ram_total_gb is not None:
        device.ram_total_gb = body.ram_total_gb
    if body.serial_number is not None:
        device.serial_number = body.serial_number
    if body.latitude is not None and body.longitude is not None:
        device.latitude = body.latitude
        device.longitude = body.longitude
        device.location_updated_at = datetime.now(timezone.utc)
    if body.ip_address is not None:
        device.ip_address = body.ip_address
    if body.network_type is not None:
        device.network_type = body.network_type
    if body.phone_number is not None:
        device.phone_number = body.phone_number
    if body.sim_1 is not None:
        device.sim_1 = body.sim_1
    if body.sim_2 is not None:
        device.sim_2 = body.sim_2
    if body.installed_apps is not None:
        device.installed_apps = json.dumps([app.dict() for app in body.installed_apps])
    if body.foreground_app is not None:
        device.foreground_app = body.foreground_app
    if body.foreground_app_package is not None:
        device.foreground_app_package = body.foreground_app_package
    if body.signal_strength is not None:
        device.signal_strength = body.signal_strength
    if body.network_latency_ms is not None:
        device.network_latency_ms = body.network_latency_ms

    device.last_seen_at = datetime.now(timezone.utc)
    await db.commit()

    return {"status": "ok", "message": "Telemetry updated successfully"}


@router.get(
    "/pending-commands",
    response_model=list[PendingCommandResponse],
    summary="Poll pending commands",
)
async def poll_pending_commands(
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Command)
        .where(
            Command.device_id == device.id,
            Command.status == CommandStatus.PENDING,
        )
        .order_by(Command.created_at.asc())
    )
    commands = result.scalars().all()

    response = []
    for cmd in commands:
        cmd.status = CommandStatus.SENT
        cmd.updated_at = datetime.now(timezone.utc)
        response.append(
            PendingCommandResponse(
                command_id=cmd.id,
                command_type=cmd.command_type.value if hasattr(cmd.command_type, "value") else str(cmd.command_type).lower(),
                payload=cmd.payload,
                created_at=cmd.created_at,
            )
        )

    device.last_seen_at = datetime.now(timezone.utc)
    return response


@router.post(
    "/command-status",
    response_model=dict,
    summary="Update command execution status",
)
async def update_command_status(
    body: CommandStatusUpdate,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Command).where(
            Command.id == body.command_id,
            Command.device_id == device.id,
        )
    )
    command = result.scalar_one_or_none()

    if not command:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Command not found for this device",
        )

    command.status = CommandStatus(body.status)
    command.result = body.result
    command.updated_at = datetime.now(timezone.utc)

    return {"status": "ok", "command_id": str(command.id), "new_status": body.status}


# ─────────────────────────────────────────────────────────────
#  GET /sync/sms-logs/{device_id} — admin queries SMS logs
# ─────────────────────────────────────────────────────────────
@router.get(
    "/sms-logs/{device_id}",
    summary="Query batch-synced SMS logs for a device",
    description="Admin endpoint to retrieve SMS messages synced from a device.",
)
async def query_sms_logs(
    device_id: str,
    sms_type: Optional[str] = Query(default=None, description="Filter: inbox|sent|draft"),
    sender: Optional[str] = Query(default=None, description="Filter by sender/address"),
    search: Optional[str] = Query(default=None, description="Search message body"),
    since: Optional[datetime] = Query(default=None, description="After this timestamp"),
    until: Optional[datetime] = Query(default=None, description="Before this timestamp"),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    dev_result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = dev_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")

    query = select(SmsLog).where(SmsLog.device_id == device.id)

    if sms_type:
        query = query.where(SmsLog.sms_type == sms_type)
    if sender:
        query = query.where(SmsLog.address == sender)
    if search:
        query = query.where(SmsLog.body.ilike(f"%{search}%"))
    if since:
        query = query.where(SmsLog.timestamp >= since)
    if until:
        query = query.where(SmsLog.timestamp <= until)

    query = query.order_by(SmsLog.timestamp.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "device_id": device.device_id,
            "address": log.address,
            "body": log.body,
            "sms_type": log.sms_type,
            "timestamp": log.timestamp.isoformat(),
            "read": log.read,
            "synced_at": log.synced_at.isoformat(),
        }
        for log in logs
    ]


# ─────────────────────────────────────────────────────────────
#  GET /sync/call-logs/{device_id} — admin queries call logs
# ─────────────────────────────────────────────────────────────
@router.get(
    "/call-logs/{device_id}",
    summary="Query batch-synced call logs for a device",
    description="Admin endpoint to retrieve call records synced from a device.",
)
async def query_call_logs(
    device_id: str,
    call_type: Optional[str] = Query(default=None, description="Filter: incoming|outgoing|missed|rejected"),
    phone: Optional[str] = Query(default=None, description="Filter by phone number"),
    since: Optional[datetime] = Query(default=None, description="After this timestamp"),
    until: Optional[datetime] = Query(default=None, description="Before this timestamp"),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    dev_result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = dev_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")

    query = select(CallLog).where(CallLog.device_id == device.id)

    if call_type:
        query = query.where(CallLog.call_type == call_type)
    if phone:
        query = query.where(CallLog.phone_number == phone)
    if since:
        query = query.where(CallLog.timestamp >= since)
    if until:
        query = query.where(CallLog.timestamp <= until)

    query = query.order_by(CallLog.timestamp.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "device_id": device.device_id,
            "phone_number": log.phone_number,
            "call_type": log.call_type,
            "duration_seconds": log.duration_seconds,
            "timestamp": log.timestamp.isoformat(),
            "contact_name": log.contact_name,
            "synced_at": log.synced_at.isoformat(),
        }
        for log in logs
    ]

