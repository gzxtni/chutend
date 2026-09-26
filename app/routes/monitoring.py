"""
EMM Backend — Monitoring Routes
────────────────────────────────
POST /monitoring/notifications          → Ingest notification batch from device
GET  /monitoring/notifications/{id}     → Query captured notifications
POST /monitoring/interactions           → Ingest interaction events from device
GET  /monitoring/interactions/{id}      → Query interaction events
POST /monitoring/screenshot             → Upload screenshot from device
GET  /monitoring/screenshot/{id}        → Get latest screenshot for a device
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_device_key, require_manager_or_master
from app.database import get_db
from app.models import Device, DeviceScreenshot, NotificationLog, UserInteraction
from app.schemas import (
    InteractionSyncRequest,
    InteractionSyncResponse,
    NotificationSyncRequest,
    NotificationSyncResponse,
    ScreenshotResponse,
    ScreenshotUploadRequest,
)

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


# ─────────────────────────────────────────────────────────────
#  Notifications
# ─────────────────────────────────────────────────────────────

@router.post(
    "/notifications",
    response_model=NotificationSyncResponse,
    summary="Ingest captured notifications from device",
)
async def sync_notifications(
    body: NotificationSyncRequest,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    objects = [
        NotificationLog(
            device_id=device.id,
            app_name=n.app_name,
            app_package=n.app_package,
            title=n.title,
            content=n.content,
            timestamp=n.timestamp,
        )
        for n in body.notifications
    ]
    db.add_all(objects)
    device.last_seen_at = datetime.now(timezone.utc)
    await db.commit()

    return NotificationSyncResponse(ingested=len(objects))


@router.get(
    "/notifications/{device_id}",
    summary="Query captured notifications for a device",
)
async def query_notifications(
    device_id: str,
    app_package: Optional[str] = Query(default=None, description="Filter by app package"),
    search: Optional[str] = Query(default=None, description="Search title/content"),
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

    query = select(NotificationLog).where(NotificationLog.device_id == device.id)

    if app_package:
        query = query.where(NotificationLog.app_package == app_package)
    if search:
        query = query.where(
            NotificationLog.title.ilike(f"%{search}%")
            | NotificationLog.content.ilike(f"%{search}%")
        )

    query = query.order_by(NotificationLog.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "app_name": log.app_name,
            "app_package": log.app_package,
            "title": log.title,
            "content": log.content,
            "timestamp": log.timestamp.isoformat(),
            "received_at": log.received_at.isoformat(),
        }
        for log in logs
    ]


# ─────────────────────────────────────────────────────────────
#  User Interactions
# ─────────────────────────────────────────────────────────────

@router.post(
    "/interactions",
    response_model=InteractionSyncResponse,
    summary="Ingest user interaction events from device",
)
async def sync_interactions(
    body: InteractionSyncRequest,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    objects = [
        UserInteraction(
            device_id=device.id,
            interaction_type=i.interaction_type,
            target_text=i.target_text,
            target_class=i.target_class,
            app_package=i.app_package,
            x=i.x,
            y=i.y,
            timestamp=i.timestamp,
        )
        for i in body.interactions
    ]
    db.add_all(objects)
    device.last_seen_at = datetime.now(timezone.utc)
    await db.commit()

    return InteractionSyncResponse(ingested=len(objects))


@router.get(
    "/interactions/{device_id}",
    summary="Query user interaction events for a device",
)
async def query_interactions(
    device_id: str,
    interaction_type: Optional[str] = Query(default=None, description="Filter: click|text_input|scroll|long_press"),
    app_package: Optional[str] = Query(default=None, description="Filter by app package"),
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

    query = select(UserInteraction).where(UserInteraction.device_id == device.id)

    if interaction_type:
        query = query.where(UserInteraction.interaction_type == interaction_type)
    if app_package:
        query = query.where(UserInteraction.app_package == app_package)

    query = query.order_by(UserInteraction.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    events = result.scalars().all()

    return [
        {
            "id": str(ev.id),
            "interaction_type": ev.interaction_type,
            "target_text": ev.target_text,
            "target_class": ev.target_class,
            "app_package": ev.app_package,
            "x": ev.x,
            "y": ev.y,
            "timestamp": ev.timestamp.isoformat(),
            "received_at": ev.received_at.isoformat(),
        }
        for ev in events
    ]


# ─────────────────────────────────────────────────────────────
#  Screenshots
# ─────────────────────────────────────────────────────────────

@router.post(
    "/screenshot",
    summary="Upload a screenshot from device",
)
async def upload_screenshot(
    body: ScreenshotUploadRequest,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    screenshot = DeviceScreenshot(
        device_id=device.id,
        image_data=body.image_base64,
        captured_at=body.captured_at,
    )
    db.add(screenshot)
    device.last_seen_at = datetime.now(timezone.utc)
    await db.commit()

    return {"status": "ok", "screenshot_id": str(screenshot.id), "message": "Screenshot uploaded"}


@router.get(
    "/screenshot/{device_id}",
    summary="Get the latest screenshot for a device",
)
async def get_latest_screenshot(
    device_id: str,
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    dev_result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = dev_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")

    result = await db.execute(
        select(DeviceScreenshot)
        .where(DeviceScreenshot.device_id == device.id)
        .order_by(DeviceScreenshot.captured_at.desc())
        .limit(1)
    )
    screenshot = result.scalar_one_or_none()

    if not screenshot:
        raise HTTPException(status_code=404, detail="No screenshots available for this device")

    return {
        "id": str(screenshot.id),
        "image_data": screenshot.image_data,
        "captured_at": screenshot.captured_at.isoformat(),
        "received_at": screenshot.received_at.isoformat(),
    }
