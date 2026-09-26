"""
EMM Backend — Monitoring Routes
────────────────────────────────
POST /monitoring/notifications          → Ingest notification batch from device
GET  /monitoring/notifications/{id}     → Query captured notifications
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_device_key, require_manager_or_master
from app.database import get_db
from app.models import Device, NotificationLog
from app.schemas import (
    NotificationSyncRequest,
    NotificationSyncResponse,
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
