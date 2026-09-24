"""
EMM Backend — Execute Command Routes (Execute_Command)
──────────────────────────────────────────────────────
POST /commands/execute          → Queue a remote command for a device
GET  /commands/{device_id}      → List all commands for a device
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_manager_or_master
from app.database import get_db
from app.models import Command, CommandStatus, CommandType, Device
from app.schemas import (
    CommandResponse,
    ExecuteCommandRequest,
)

router = APIRouter(prefix="/commands", tags=["Execute Command"])


REQUIRED_PAYLOAD_FIELDS: dict[str, list[str]] = {
    "send_sms": ["to", "message"],
    "install_app": ["package_name"],
    "uninstall_app": ["package_name"],
    "set_policy": ["policy"],
    "set_ringer_mode": ["mode"],
    "set_brightness": ["brightness"],
    "launch_app": ["package_name"],
}


def _validate_payload(command_type: str, payload: dict | None) -> str | None:
    """Validate and serialize the payload. Returns JSON string or None."""
    required = REQUIRED_PAYLOAD_FIELDS.get(command_type, [])
    if required:
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Command '{command_type}' requires payload with fields: {required}",
            )
        missing = [f for f in required if f not in payload]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Missing required payload fields: {missing}",
            )
    return json.dumps(payload) if payload else None


@router.post(
    "/execute",
    response_model=CommandResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute a remote command on a device",
)
async def execute_command(
    body: ExecuteCommandRequest,
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.device_id == body.device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{body.device_id}' not found",
        )
    if not device.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device '{body.device_id}' is deactivated",
        )

    serialized_payload = _validate_payload(body.command_type, body.payload)

    command = Command(
        device_id=device.id,
        command_type=CommandType(body.command_type),
        payload=serialized_payload,
        status=CommandStatus.PENDING,
    )
    db.add(command)
    await db.flush()

    return CommandResponse(
        command_id=command.id,
        device_id=body.device_id,
        command_type=body.command_type,
        status=command.status.value,
    )


@router.get(
    "/{device_id}",
    summary="List commands for a device",
)
async def list_device_commands(
    device_id: str,
    status_filter: CommandStatus | None = Query(default=None, alias="status"),
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found",
        )

    query = select(Command).where(Command.device_id == device.id)
    if status_filter:
        query = query.where(Command.status == status_filter)
    query = query.order_by(Command.created_at.desc())

    result = await db.execute(query)
    commands = result.scalars().all()

    return [
        {
            "command_id": str(cmd.id),
            "command_type": cmd.command_type.value,
            "status": cmd.status.value,
            "payload": cmd.payload,
            "result": cmd.result,
            "created_at": cmd.created_at.isoformat(),
            "updated_at": cmd.updated_at.isoformat() if cmd.updated_at else None,
        }
        for cmd in commands
    ]
