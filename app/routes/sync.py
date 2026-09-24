"""
EMM Backend — Device Sync Routes (Device_Sync)
───────────────────────────────────────────────
POST /sync/data             → Receive batch SMS + Call logs from a device
GET  /sync/pending-commands → Device polls for queued commands
POST /sync/command-status   → Device reports command execution result
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_device_key
from app.database import get_db
from app.models import CallLog, Command, CommandStatus, Device, SmsLog
from app.schemas import (
    CommandStatusUpdate,
    DeviceSyncRequest,
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
                command_type=cmd.command_type.value,
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
