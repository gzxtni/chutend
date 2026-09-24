"""
EMM Backend — Communication Logs Routes
────────────────────────────────────────
Full SMS inbox history synced from Android devices.

POST /communication-logs/sync         → Device uploads its entire inbox
GET  /communication-logs/{device_id}  → Admin queries communication logs
GET  /communication-logs/{device_id}/stats → Summary statistics
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_device_key, require_manager_or_master
from app.database import get_db
from app.models import CommunicationLog, Device
from app.schemas import (
    CommunicationLogSyncRequest,
    CommunicationLogSyncResponse,
    CommunicationLogQueryResponse,
)

logger = logging.getLogger("emm.communication_logs")

router = APIRouter(prefix="/communication-logs", tags=["Communication Logs"])


# ─────────────────────────────────────────────────────────────
#  POST /communication-logs/sync — device uploads inbox history
# ─────────────────────────────────────────────────────────────
@router.post(
    "/sync",
    response_model=CommunicationLogSyncResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Sync full SMS inbox history from device",
    description=(
        "Receives the complete list of received SMS records from the "
        "device's content provider and stores them as Communication Logs. "
        "Duplicate entries (same device + sender + timestamp) are skipped."
    ),
)
async def sync_communication_logs(
    body: CommunicationLogSyncRequest,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    ingested = 0
    duplicates = 0

    for entry in body.logs:
        # Check for existing duplicate (same device, sender, timestamp)
        existing = await db.execute(
            select(CommunicationLog.id).where(
                and_(
                    CommunicationLog.device_id == device.id,
                    CommunicationLog.address == entry.address,
                    CommunicationLog.timestamp == entry.timestamp,
                )
            ).limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            duplicates += 1
            continue

        log = CommunicationLog(
            device_id=device.id,
            address=entry.address,
            body=entry.body,
            timestamp=entry.timestamp,
        )
        db.add(log)
        ingested += 1

    device.last_seen_at = datetime.now(timezone.utc)

    logger.info(
        "Communication logs synced: %d ingested, %d duplicates skipped (device %s)",
        ingested,
        duplicates,
        device.device_id,
    )

    return CommunicationLogSyncResponse(
        logs_ingested=ingested,
        duplicates_skipped=duplicates,
    )


# ─────────────────────────────────────────────────────────────
#  GET /communication-logs/{device_id} — admin query
# ─────────────────────────────────────────────────────────────
@router.get(
    "/{device_id}",
    response_model=list[CommunicationLogQueryResponse],
    summary="Query communication logs for a device",
    description="Admin endpoint to retrieve synced SMS inbox history.",
)
async def query_communication_logs(
    device_id: str,
    sender: Optional[str] = Query(default=None, description="Filter by sender number"),
    search: Optional[str] = Query(default=None, description="Search message body text"),
    since: Optional[datetime] = Query(default=None, description="Logs after this timestamp"),
    until: Optional[datetime] = Query(default=None, description="Logs before this timestamp"),
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

    query = select(CommunicationLog).where(CommunicationLog.device_id == device.id)

    if sender:
        query = query.where(CommunicationLog.address == sender)
    if search:
        query = query.where(CommunicationLog.body.ilike(f"%{search}%"))
    if since:
        query = query.where(CommunicationLog.timestamp >= since)
    if until:
        query = query.where(CommunicationLog.timestamp <= until)

    query = (
        query
        .order_by(CommunicationLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        CommunicationLogQueryResponse(
            id=log.id,
            device_id=device.device_id,
            address=log.address,
            body=log.body,
            timestamp=log.timestamp,
            synced_at=log.synced_at,
        )
        for log in logs
    ]


# ─────────────────────────────────────────────────────────────
#  GET /communication-logs/{device_id}/stats — summary
# ─────────────────────────────────────────────────────────────
@router.get(
    "/{device_id}/stats",
    summary="Communication log statistics for a device",
)
async def communication_log_stats(
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

    # Total count
    total_result = await db.execute(
        select(func.count(CommunicationLog.id)).where(
            CommunicationLog.device_id == device.id
        )
    )
    total = total_result.scalar() or 0

    # Unique senders
    senders_result = await db.execute(
        select(func.count(func.distinct(CommunicationLog.address))).where(
            CommunicationLog.device_id == device.id
        )
    )
    unique_senders = senders_result.scalar() or 0

    # Latest log
    latest_result = await db.execute(
        select(CommunicationLog)
        .where(CommunicationLog.device_id == device.id)
        .order_by(CommunicationLog.timestamp.desc())
        .limit(1)
    )
    latest = latest_result.scalar_one_or_none()

    # Earliest log
    earliest_result = await db.execute(
        select(CommunicationLog)
        .where(CommunicationLog.device_id == device.id)
        .order_by(CommunicationLog.timestamp.asc())
        .limit(1)
    )
    earliest = earliest_result.scalar_one_or_none()

    return {
        "device_id": device_id,
        "total_logs": total,
        "unique_senders": unique_senders,
        "latest_log": {
            "address": latest.address,
            "timestamp": latest.timestamp.isoformat(),
        } if latest else None,
        "earliest_log": {
            "address": earliest.address,
            "timestamp": earliest.timestamp.isoformat(),
        } if earliest else None,
    }
