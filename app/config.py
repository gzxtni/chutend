"""
EMM Backend — Application Configuration
─────────────────────────────────────────
Loads settings from environment variables / .env file using Pydantic Settings.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration loaded from .env or environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://emm_user:password@localhost:5432/emm_db"

    # ── Server ────────────────────────────────────────────────
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    # ── Security ──────────────────────────────────────────────
    master_api_key: str = "change-me-to-a-strong-random-key"
    jwt_secret: str = "change-me-jwt-secret-key-256bit"
    jwt_expiry_hours: int = 24

    # ── Logging ───────────────────────────────────────────────
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (read once, reuse everywhere)."""
    return Settings()
