"""
EMM Backend — Device Management Routes
───────────────────────────────────────
POST /devices/register   → Register a new Android device (master key)
GET  /devices             → List all registered devices (master key)
GET  /devices/{device_id} → Get single device info (master key)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import generate_device_api_key, require_manager_or_master, require_master_key
from app.database import get_db
from app.models import Device
from app.schemas import (
    DeviceInfoResponse,
    DeviceRegisterRequest,
    DeviceRegisterResponse,
)

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post(
    "/register",
    response_model=DeviceRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new device",
)
async def register_device(
    body: DeviceRegisterRequest,
    _: str = Depends(require_master_key),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Device).where(Device.device_id == body.device_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Device '{body.device_id}' is already registered",
        )

    api_key = generate_device_api_key()
    device = Device(
        device_id=body.device_id,
        device_name=body.device_name,
        model=body.model,
        manufacturer=body.manufacturer,
        os_version=body.os_version,
        api_key=api_key,
    )
    db.add(device)
    await db.flush()

    return DeviceRegisterResponse(
        id=device.id,
        device_id=device.device_id,
        api_key=api_key,
    )


@router.get(
    "",
    response_model=list[DeviceInfoResponse],
    summary="List all devices",
)
async def list_devices(
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).order_by(Device.registered_at.desc())
    )
    return result.scalars().all()


@router.get(
    "/{device_id}",
    response_model=DeviceInfoResponse,
    summary="Get device details",
)
async def get_device(
    device_id: str,
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
    return device


@router.delete(
    "/{device_id}",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete device and all its records from database",
)
async def delete_device(
    device_id: str,
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

    await db.delete(device)
    await db.flush()

    return {
        "status": "success",
        "message": f"Device '{device_id}' and all associated records permanently removed from database",
        "device_id": device_id,
    }

