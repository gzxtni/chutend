"""
EMM Backend — Manager Authentication Routes
─────────────────────────────────────────────
POST /auth/login             → Manager login (returns JWT)
POST /auth/managers          → Create a new manager (master key)
GET  /auth/me                → Get current manager profile (JWT)
GET  /auth/managers          → List all managers (master key)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_jwt,
    hash_password,
    require_manager_jwt,
    require_master_key,
    verify_password,
)
from app.config import get_settings
from app.database import get_db
from app.models import Manager
from app.schemas import (
    ManagerCreateRequest,
    ManagerLoginRequest,
    ManagerLoginResponse,
    ManagerProfileResponse,
)

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=ManagerLoginResponse,
    summary="Manager login",
    description=(
        "Authenticate with username and password. Returns a JWT Bearer "
        "token that the dashboard uses for all subsequent API calls."
    ),
)
async def manager_login(
    body: ManagerLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Manager).where(Manager.username == body.username)
    )
    manager = result.scalar_one_or_none()

    if not manager or not verify_password(body.password, manager.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not manager.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager account is deactivated",
        )

    # Update last login timestamp
    manager.last_login_at = datetime.now(timezone.utc)

    token = create_jwt(manager)

    return ManagerLoginResponse(
        access_token=token,
        expires_in_hours=settings.jwt_expiry_hours,
        manager=ManagerProfileResponse.model_validate(manager),
    )


@router.post(
    "/managers",
    response_model=ManagerProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a manager account",
    description="Requires the master API key. Creates a new manager who can log in to the dashboard.",
)
async def create_manager(
    body: ManagerCreateRequest,
    _: str = Depends(require_master_key),
    db: AsyncSession = Depends(get_db),
):
    # Check for duplicate username
    existing = await db.execute(
        select(Manager).where(Manager.username == body.username)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{body.username}' is already taken",
        )

    manager = Manager(
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        role=body.role,
    )
    db.add(manager)
    await db.flush()

    return ManagerProfileResponse.model_validate(manager)


@router.get(
    "/me",
    response_model=ManagerProfileResponse,
    summary="Get current manager profile",
    description="Returns the profile of the currently authenticated manager.",
)
async def get_current_manager(
    manager: Manager = Depends(require_manager_jwt),
):
    return ManagerProfileResponse.model_validate(manager)


@router.get(
    "/managers",
    response_model=list[ManagerProfileResponse],
    summary="List all managers",
    description="Requires the master API key. Lists all manager accounts.",
)
async def list_managers(
    _: str = Depends(require_master_key),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Manager).order_by(Manager.created_at.desc())
    )
    managers = result.scalars().all()
    return [ManagerProfileResponse.model_validate(m) for m in managers]
