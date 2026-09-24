"""
EMM Backend — Async Database Engine & Session
──────────────────────────────────────────────
Provides a shared async SQLAlchemy engine and a dependency-injectable session factory.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# ── Engine ────────────────────────────────────────────────────
engine = create_async_engine(
    settings.database_url,
    echo=(settings.log_level == "DEBUG"),
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

# ── Session factory ───────────────────────────────────────────
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Declarative base ─────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# ── FastAPI dependency ────────────────────────────────────────
async def get_db() -> AsyncSession:
    """Yield a transactional database session, auto-closing on exit."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
