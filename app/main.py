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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe column additions if table already exists in Supabase/PostgreSQL
        from sqlalchemy import text
        migration_statements = [
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
            "ALTER TABLE devices ADD COLUMN IF NOT EXISTS installed_apps TEXT;",
        ]
        for stmt in migration_statements:
            try:
                await conn.execute(text(stmt))
            except Exception as e:
                logger.warning(f"Column migration notice: {e}")
    logger.info("✅ Database tables and telemetry columns ready")
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


# ── Health check ──────────────────────────────────────────────
@app.get("/health", tags=["System"], summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "service": "EMM Backend",
        "version": "2.0.0",
    }
