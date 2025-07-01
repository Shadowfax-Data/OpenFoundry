from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from openfoundry.database import session_local
from openfoundry.logger import logger
from openfoundry.middleware import LocalhostCORSMiddleware, SQLAlchemySessionMiddleware
from openfoundry.routers.agent_sessions import app_agent_session_router
from openfoundry.routers.app_api import router as app_router

app = FastAPI()

# Include all routers
app.include_router(app_agent_session_router)
app.include_router(app_router)

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
