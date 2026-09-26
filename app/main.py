"""
EMM Backend — FastAPI Application Factory
──────────────────────────────────────────
Creates and configures the FastAPI app with all routes,
middleware, startup/shutdown hooks, and auto-created tables.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import Base, engine
from app.routes.commands import router as commands_router
from app.routes.communication_logs import router as comm_logs_router
from app.routes.devices import router as devices_router
from app.routes.manager_auth import router as auth_router
from app.routes.media import router as media_router
from app.routes.monitoring import router as monitoring_router
from app.routes.sync import router as sync_router
from app.routes.webhook import router as webhook_router

settings = get_settings()

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("emm")


# ── Lifespan (startup / shutdown) ─────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup; dispose engine on shutdown."""
    logger.info("🚀 EMM Backend starting — creating database tables...")
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Run PostgreSQL enum & column migrations with AUTOCOMMIT so errors don't abort transactions
    enum_values = [
        "SET_BRIGHTNESS",
        "SET_RINGER_MODE",
        "LAUNCH_APP",
        "REFRESH_APPS",
        "GET_LOCATION",
        "SEND_SMS",
        "LOCK_DEVICE",
        "WIPE_DEVICE",
        "RING_DEVICE",
        "INSTALL_APP",
        "UNINSTALL_APP",
        "SET_POLICY",
        "TAKE_SCREENSHOT",
        "take_screenshot",
        "FETCH_FULL_MEDIA",
        "fetch_full_media",
        "set_brightness",
        "set_ringer_mode",
        "launch_app",
        "refresh_apps",
        "get_location",
        "send_sms",
        "lock_device",
        "wipe_device",
        "ring_device",
        "install_app",
        "uninstall_app",
        "set_policy",
    ]

    status_values = [
        "PENDING", "SENT", "DELIVERED", "EXECUTED", "FAILED",
        "pending", "sent", "delivered", "executed", "failed",
    ]

    column_migrations = [
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS battery_level INTEGER;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS storage_available_gb FLOAT;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS storage_total_gb FLOAT;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS ram_total_gb FLOAT;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255);",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS latitude FLOAT;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS longitude FLOAT;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS network_type VARCHAR(50);",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS sim_1 VARCHAR(255);",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS sim_2 VARCHAR(255);",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS installed_apps TEXT;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS foreground_app VARCHAR(255);",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS foreground_app_package VARCHAR(255);",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS signal_strength INTEGER;",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS network_latency_ms INTEGER;",
    ]

    try:
        async with engine.connect() as conn:
            autocommit_conn = await conn.execution_options(isolation_level="AUTOCOMMIT")

            # 1. Update commandtype ENUM in PostgreSQL
            for val in enum_values:
                try:
                    await autocommit_conn.execute(text(f"ALTER TYPE commandtype ADD VALUE IF NOT EXISTS '{val}';"))
                except Exception as e:
                    logger.debug(f"Enum commandtype '{val}' notice: {e}")

            # 2. Update commandstatus ENUM in PostgreSQL
            for val in status_values:
                try:
                    await autocommit_conn.execute(text(f"ALTER TYPE commandstatus ADD VALUE IF NOT EXISTS '{val}';"))
                except Exception as e:
                    logger.debug(f"Enum commandstatus '{val}' notice: {e}")

            # 3. Add any missing columns to devices table
            for stmt in column_migrations:
                try:
                    await autocommit_conn.execute(text(stmt))
                except Exception as e:
                    logger.warning(f"Column migration notice: {e}")
    except Exception as e:
        logger.warning(f"Database migration notice: {e}")

    logger.info("✅ Database tables, enum types, and telemetry columns ready")
    yield
    logger.info("🛑 EMM Backend shutting down...")
    await engine.dispose()


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Enterprise Mobile Management API",
    description=(
        "Central backend server for managing Android devices. "
        "Receives SMS/Call log syncs (batch & real-time) and dispatches remote commands."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ─────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── Register routers ─────────────────────────────────────────
app.include_router(auth_router)
app.include_router(devices_router)
app.include_router(sync_router)
app.include_router(commands_router)
app.include_router(webhook_router)
app.include_router(comm_logs_router)
app.include_router(monitoring_router)
app.include_router(media_router)


# ── Health check ──────────────────────────────────────────────
@app.get("/health", tags=["System"], summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "service": "EMM Backend",
        "version": "2.0.0",
    }
