"""
EMM Backend — Media Library Routes
───────────────────────────────────
POST /media/thumbnails              → Ingest gallery thumbnails from device
GET  /media/gallery/{device_id}     → Query gallery thumbnails for dashboard
POST /media/full-file               → Device uploads full-res file for a media item
GET  /media/full-file/{media_id}    → Dashboard downloads full-res file
POST /media/request-full/{device_id}/{media_store_id} → Request device to fetch+send full file
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_device_key, require_manager_or_master
from app.database import get_db
from app.models import Device, MediaItem, MediaFullFile, Command, CommandType, CommandStatus
from app.schemas import (
    MediaThumbnailSyncRequest,
    MediaThumbnailSyncResponse,
    MediaFullFileUploadRequest,
)

router = APIRouter(prefix="/media", tags=["Media Library"])


# ─────────────────────────────────────────────────────────────
#  Thumbnail Sync (Device → Server)
# ─────────────────────────────────────────────────────────────

@router.post(
    "/thumbnails",
    response_model=MediaThumbnailSyncResponse,
    summary="Ingest gallery thumbnails from device",
)
async def sync_thumbnails(
    body: MediaThumbnailSyncRequest,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    ingested = 0
    skipped = 0

    for thumb in body.thumbnails:
        # Check if this media_store_id already exists for this device
        existing = await db.execute(
            select(MediaItem).where(
                MediaItem.device_id == device.id,
                MediaItem.media_store_id == thumb.media_store_id,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        item = MediaItem(
            device_id=device.id,
            media_store_id=thumb.media_store_id,
            media_type=thumb.media_type,
            file_name=thumb.file_name,
            file_size=thumb.file_size,
            width=thumb.width,
            height=thumb.height,
            duration_ms=thumb.duration_ms,
            mime_type=thumb.mime_type,
            date_taken=thumb.date_taken,
            thumbnail_b64=thumb.thumbnail_b64,
        )
        db.add(item)
        ingested += 1

    device.last_seen_at = datetime.now(timezone.utc)
    await db.commit()

    return MediaThumbnailSyncResponse(
        ingested=ingested,
        skipped=skipped,
        message=f"Synced {ingested} thumbnails, skipped {skipped} duplicates",
    )


# ─────────────────────────────────────────────────────────────
#  Gallery Query (Dashboard)
# ─────────────────────────────────────────────────────────────

@router.get(
    "/gallery/{device_id}",
    summary="Query gallery thumbnails for a device",
)
async def query_gallery(
    device_id: str,
    media_type: Optional[str] = Query(default=None, description="Filter: image | video"),
    search: Optional[str] = Query(default=None, description="Search file names"),
    limit: int = Query(default=50, le=200),
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

    query = select(MediaItem).where(MediaItem.device_id == device.id)

    if media_type:
        query = query.where(MediaItem.media_type == media_type)
    if search:
        query = query.where(MediaItem.file_name.ilike(f"%{search}%"))

    # Get total count
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(MediaItem.date_taken.desc().nullslast()).offset(offset).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "total": total,
        "items": [
            {
                "id": str(item.id),
                "media_store_id": item.media_store_id,
                "media_type": item.media_type,
                "file_name": item.file_name,
                "file_size": item.file_size,
                "width": item.width,
                "height": item.height,
                "duration_ms": item.duration_ms,
                "mime_type": item.mime_type,
                "date_taken": item.date_taken.isoformat() if item.date_taken else None,
                "thumbnail_b64": item.thumbnail_b64,
                "has_full_file": item.has_full_file,
                "synced_at": item.synced_at.isoformat(),
            }
            for item in items
        ],
    }


# ─────────────────────────────────────────────────────────────
#  Request Full File (Dashboard → Device)
# ─────────────────────────────────────────────────────────────

@router.post(
    "/request-full/{device_id}/{media_store_id}",
    summary="Request device to fetch and send the full-resolution file",
)
async def request_full_file(
    device_id: str,
    media_store_id: str,
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    dev_result = await db.execute(
        select(Device).where(Device.device_id == device_id)
    )
    device = dev_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")

    # Check the media item exists
    item_result = await db.execute(
        select(MediaItem).where(
            MediaItem.device_id == device.id,
            MediaItem.media_store_id == media_store_id,
        )
    )
    media_item = item_result.scalar_one_or_none()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media item not found")

    # Check if full file already exists
    full_result = await db.execute(
        select(MediaFullFile).where(MediaFullFile.media_item_id == media_item.id)
    )
    full_file = full_result.scalar_one_or_none()
    if media_item.has_full_file and full_file:
        return {
            "status": "ready",
            "message": "Full file already available",
            "media_id": str(media_item.id),
        }

    # Queue a command to the device to fetch and upload the full file
    import json
    cmd = Command(
        device_id=device.id,
        command_type=CommandType.FETCH_FULL_MEDIA,
        payload=json.dumps({"media_store_id": media_store_id}),
        status=CommandStatus.PENDING,
    )
    db.add(cmd)
    await db.commit()

    return {
        "status": "requested",
        "message": "Command sent to device — full file will be uploaded shortly",
        "command_id": str(cmd.id),
        "media_id": str(media_item.id),
    }


# ─────────────────────────────────────────────────────────────
#  Full File Upload (Device → Server)
# ─────────────────────────────────────────────────────────────

@router.post(
    "/full-file",
    summary="Device uploads a full-resolution media file",
)
async def upload_full_file(
    body: MediaFullFileUploadRequest,
    device: Device = Depends(require_device_key),
    db: AsyncSession = Depends(get_db),
):
    # Find the matching media item
    item_result = await db.execute(
        select(MediaItem).where(
            MediaItem.device_id == device.id,
            MediaItem.media_store_id == body.media_store_id,
        )
    )
    media_item = item_result.scalar_one_or_none()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media item not found — sync thumbnails first")

    # Upsert the full file
    full_result = await db.execute(
        select(MediaFullFile).where(MediaFullFile.media_item_id == media_item.id)
    )
    full_file = full_result.scalar_one_or_none()
    if full_file:
        full_file.file_data = body.file_data
        full_file.mime_type = body.mime_type
        full_file.fetched_at = datetime.now(timezone.utc)
    else:
        full_file = MediaFullFile(
            media_item_id=media_item.id,
            file_data=body.file_data,
            mime_type=body.mime_type,
        )
        db.add(full_file)

    media_item.has_full_file = True
    device.last_seen_at = datetime.now(timezone.utc)
    await db.commit()

    return {"status": "ok", "message": "Full file uploaded", "media_id": str(media_item.id)}


# ─────────────────────────────────────────────────────────────
#  Full File Download (Dashboard)
# ─────────────────────────────────────────────────────────────

@router.get(
    "/full-file/{media_id}",
    summary="Download the full-resolution file for a media item",
)
async def get_full_file(
    media_id: str,
    _: str = Depends(require_manager_or_master),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MediaItem).where(MediaItem.id == media_id)
    )
    media_item = result.scalar_one_or_none()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media item not found")

    full_result = await db.execute(
        select(MediaFullFile).where(MediaFullFile.media_item_id == media_item.id)
    )
    full = full_result.scalar_one_or_none()
    if not full:
        raise HTTPException(status_code=404, detail="Full file not yet available — request it first")

    return {
        "id": str(full.id),
        "file_data": full.file_data,
        "mime_type": full.mime_type,
        "fetched_at": full.fetched_at.isoformat(),
        "file_name": media_item.file_name,
        "media_type": media_item.media_type,
    }
