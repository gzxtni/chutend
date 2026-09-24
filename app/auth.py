"""
EMM Backend — Authentication & Authorisation
─────────────────────────────────────────────
Three-tier auth model:

  1. Master API key   → server-side only, used to create manager accounts
                        and register devices.
  2. Manager JWT      → issued after username+password login; used by the
                        dashboard for all admin read/write operations.
  3. Device API key   → per-device key for sync, webhook, and command poll.

The dashboard NEVER touches the master API key.  Managers authenticate
with a JWT stored in the browser.  Android devices continue using their
per-device API key in the X-API-Key header.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import Device, Manager

settings = get_settings()

# ── Reusable FastAPI security scheme ─────────────────────────
bearer_scheme = HTTPBearer(auto_error=False)


# ═══════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════

def generate_device_api_key() -> str:
    """Generate a cryptographically secure 64-char hex API key."""
    return secrets.token_hex(32)


def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_jwt(manager: Manager) -> str:
    """
    Create a signed JWT for a manager session.
    Payload includes manager id, username, role, and expiry.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(manager.id),
        "username": manager.username,
        "role": manager.role,
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_expiry_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_jwt(token: str) -> dict:
    """Decode and verify a JWT token. Raises on invalid/expired tokens."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired — please log in again",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )


# ═══════════════════════════════════════════════════════════════
#  FastAPI Dependencies
# ═══════════════════════════════════════════════════════════════

async def require_master_key(
    x_api_key: str = Header(..., alias="X-API-Key",
                            description="Master admin API key"),
) -> str:
    """
    Dependency: caller must present the master API key.
    Used exclusively for bootstrapping (creating managers, registering devices).
    """
    if not secrets.compare_digest(x_api_key, settings.master_api_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing master API key",
        )
    return x_api_key


async def require_manager_jwt(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Manager:
    """
    Dependency: caller must present a valid JWT Bearer token.
    Returns the authenticated Manager ORM instance.
    Used by all dashboard-facing admin endpoints.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required — provide a Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_jwt(credentials.credentials)

    result = await db.execute(
        select(Manager).where(
            Manager.id == payload["sub"],
            Manager.is_active == True,
        )
    )
    manager: Optional[Manager] = result.scalar_one_or_none()

    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Manager account not found or deactivated",
        )
    return manager


async def require_manager_or_master(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> str:
    """
    Dependency: caller can authenticate with EITHER a manager JWT
    (Bearer token) or the master API key (X-API-Key header).

    Returns 'jwt' or 'master' to indicate which method was used.
    This allows admin endpoints to be used from both the dashboard
    and server-side scripts.
    """
    # Try JWT first
    if credentials is not None:
        payload = decode_jwt(credentials.credentials)
        result = await db.execute(
            select(Manager).where(
                Manager.id == payload["sub"],
                Manager.is_active == True,
            )
        )
        manager = result.scalar_one_or_none()
        if manager is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Manager account not found or deactivated",
            )
        return "jwt"

    # Fall back to master key
    if x_api_key and secrets.compare_digest(x_api_key, settings.master_api_key):
        return "master"

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required — provide a Bearer token or X-API-Key",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_device_key(
    x_api_key: str = Header(..., alias="X-API-Key",
                            description="Per-device API key"),
    db: AsyncSession = Depends(get_db),
) -> Device:
    """
    Dependency: caller must present a valid per-device API key.
    Returns the authenticated Device ORM instance.
    """
    result = await db.execute(
        select(Device).where(
            Device.api_key == x_api_key,
            Device.is_active == True,
        )
    )
    device: Optional[Device] = result.scalar_one_or_none()

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid device API key or device is deactivated",
        )
    return device
