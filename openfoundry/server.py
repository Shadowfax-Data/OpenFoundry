from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from openfoundry.config import STORAGE_DIR
from openfoundry.database import session_local
from openfoundry.logger import logger
from openfoundry.middleware import LocalhostCORSMiddleware, SQLAlchemySessionMiddleware
from openfoundry.routers.agent_sessions import app_agent_session_router
from openfoundry.routers.agent_sessions.app_agent_api import (
    router as app_agent_api_router,
)
from openfoundry.routers.app_api import router as app_router


def initialize_storage():
    """Initialize storage directory if it doesn't exist."""
    storage_dir = Path(STORAGE_DIR)
    storage_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Storage directory: {storage_dir}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI app."""
    initialize_storage()
    yield


app = FastAPI(lifespan=lifespan)

# Include all routers
app.include_router(app_agent_session_router, tags=["apps", "agent-sessions"])
app.include_router(app_agent_api_router, tags=["apps", "agent-sessions"])
app.include_router(app_router, tags=["apps"])

app.add_middleware(
    SQLAlchemySessionMiddleware,
    session_local=session_local,
    whitelisted_prefixes=["/api"],
)

app.add_middleware(
    LocalhostCORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    logger.info("Health check endpoint called")
    return {"status": "ok"}


app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")
