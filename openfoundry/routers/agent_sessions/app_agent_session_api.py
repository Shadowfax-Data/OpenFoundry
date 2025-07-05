import uuid
from datetime import datetime

import docker
import httpx
import uuid6
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from openfoundry.agents.run_context import AppAgentRunContext
from openfoundry.agents.streamlit_app_coding_agent import (
    STREAMLIT_APP_CODING_AGENT_NAME,
)
from openfoundry.logger import logger
from openfoundry.models.agent_sessions import (
    AgentSession,
    AgentSessionStatus,
    AppAgentSession,
)
from openfoundry.models.apps import App

# Define terminal statuses for agent sessions
AGENT_SESSION_TERMINAL_STATUSES = [
    AgentSessionStatus.STOPPED,
]


router = APIRouter(prefix="/api")


class AppAgentSessionModel(BaseModel):
    id: uuid.UUID
    app_id: uuid.UUID
    version: int
    status: AgentSessionStatus
    created_on: datetime
    app_port: int
    port: int
    container_id: str

    class Config:
        from_attributes = True


class ListFilesResponse(BaseModel):
    files: list[str]


class ReadFileResponse(BaseModel):
    file_path: str
    content: str


class WriteFileRequest(BaseModel):
    file_path: str
    content: str


class WriteFileResponse(BaseModel):
    message: str


def get_app_agent_run_context(
    request: Request,
    app_id: uuid.UUID,
    session_id: uuid.UUID,
) -> AppAgentRunContext:
    """Get the run context for a given app agent session."""
    db: Session = request.state.db

    app_agent_session = (
        db.query(AppAgentSession)
        .options(joinedload(AppAgentSession.agent_session))
        .filter(
            AppAgentSession.id == session_id,
            AppAgentSession.app_id == app_id,
        )
        .first()
    )

    if not app_agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found for app {app_id}",
        )

    agent_session = app_agent_session.agent_session
    if agent_session.status != AgentSessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session with id {session_id} is not active",
        )

    return AppAgentRunContext(
        session_id=agent_session.id,
        version=agent_session.version,
        sandbox_url=f"http://localhost:{agent_session.port}",
    )


@router.post(
    "/apps/{app_id}/sessions",
    response_model=AppAgentSessionModel,
    status_code=status.HTTP_201_CREATED,
)
def create_app_agent_session(request: Request, app_id: uuid.UUID):
    """Create a new app agent session."""
    db: Session = request.state.db
    session_id = uuid6.uuid6()

    # Verify the app exists
    app = db.query(App).filter(App.id == app_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"App with id {app_id} not found",
        )

    # Check for existing active session for this app since there can only be one active session per app
    existing_session_count = (
        db.query(AppAgentSession)
        .join(AgentSession)
        .filter(
            AppAgentSession.app_id == app_id,
            AgentSession.status.not_in(AGENT_SESSION_TERMINAL_STATUSES),
        )
        .count()
    )

    if existing_session_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"App {app_id} already has an active session",
        )

    # Create the app agent session
    app_agent_session = AppAgentSession(id=session_id, app_id=app_id)

    # Create Docker container
    container_info = app_agent_session.create_in_docker(
        workspace_dir=str(app.get_workspace_directory())
    )

    # Extract container information
    container_id = container_info["container_id"]
    assigned_sandbox_port = container_info["assigned_sandbox_port"]

    logger.info(
        f"Container ID: {container_id}, Assigned sandbox port for app session {session_id}: {assigned_sandbox_port}"
    )

    # Create and associate the corresponding agent session
    agent_session = app_agent_session.as_agent_session(
        agent=STREAMLIT_APP_CODING_AGENT_NAME,
        container_id=container_id,
        port=assigned_sandbox_port,
    )

    db.add(agent_session)
    db.add(app_agent_session)
    db.commit()
    db.refresh(app_agent_session)
    db.refresh(agent_session)

    # Set necessary attributes for the response model
    setattr(app_agent_session, "status", agent_session.status)
    setattr(app_agent_session, "version", agent_session.version)
    setattr(app_agent_session, "port", agent_session.port)
    setattr(app_agent_session, "container_id", agent_session.container_id)

    return AppAgentSessionModel.model_validate(app_agent_session)


@router.get("/apps/{app_id}/sessions/{session_id}", response_model=AppAgentSessionModel)
def get_app_agent_session(app_id: uuid.UUID, session_id: uuid.UUID, request: Request):
    """Get a specific app agent session."""
    db: Session = request.state.db

    # Get the specific agent session for the app
    app_agent_session = (
        db.query(AppAgentSession)
        .options(joinedload(AppAgentSession.agent_session))
        .filter(
            AppAgentSession.id == session_id,
            AppAgentSession.app_id == app_id,
        )
        .first()
    )

    if not app_agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found for app {app_id}",
        )

    agent_session = app_agent_session.agent_session
    setattr(app_agent_session, "status", agent_session.status)
    setattr(app_agent_session, "version", agent_session.version)
    setattr(app_agent_session, "port", agent_session.port)
    setattr(app_agent_session, "container_id", agent_session.container_id)
    logger.info(
        f"App preview available at http://localhost:{app_agent_session.app_port}"
    )
    return AppAgentSessionModel.model_validate(app_agent_session)


@router.get("/apps/{app_id}/sessions", response_model=list[AppAgentSessionModel])
def get_app_agent_sessions(app_id: uuid.UUID, request: Request):
    """Get all app agent sessions for a specific app."""
    db: Session = request.state.db

    # Get all agent sessions for the app with agent_session eager loaded
    # Sort by created_on descending (newest first), then by session id
    app_agent_sessions = (
        db.query(AppAgentSession)
        .options(joinedload(AppAgentSession.agent_session))
        .filter(AppAgentSession.app_id == app_id)
        .join(AgentSession, AppAgentSession.id == AgentSession.id)
        .order_by(AppAgentSession.created_on.desc(), AppAgentSession.id)
        .all()
    )

    for app_agent_session in app_agent_sessions:
        agent_session = app_agent_session.agent_session
        setattr(app_agent_session, "status", agent_session.status)
        setattr(app_agent_session, "version", agent_session.version)
        setattr(app_agent_session, "port", agent_session.port)
        setattr(app_agent_session, "container_id", agent_session.container_id)

    return app_agent_sessions


@router.put(
    "/apps/{app_id}/sessions/{session_id}",
    response_model=AppAgentSessionModel,
    status_code=status.HTTP_200_OK,
)
def update_app_agent_session(
    app_id: uuid.UUID, session_id: uuid.UUID, request: Request
):
    """Update an app agent session by stopping its Docker container."""
    db: Session = request.state.db

    # Get the specific agent session for the app
    app_agent_session = (
        db.query(AppAgentSession)
        .options(joinedload(AppAgentSession.agent_session))
        .filter(
            AppAgentSession.id == session_id,
            AppAgentSession.app_id == app_id,
        )
        .first()
    )

    if not app_agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found for app {app_id}",
        )

    # Check if the session has a container to stop
    if not app_agent_session.agent_session.container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} does not have an associated container",
        )

    # Stop the Docker container
    try:
        docker_client = docker.from_env()
        container = docker_client.containers.get(
            app_agent_session.agent_session.container_id
        )

        logger.info(
            f"Stopping Docker container {app_agent_session.agent_session.container_id} for session {session_id}"
        )
        container.stop()
        logger.info(f"Docker container stopped for session {session_id}")

    except docker.errors.NotFound:
        # Container doesn't exist, but we can still update the status
        logger.warning(
            f"Container {app_agent_session.agent_session.container_id} not found, updating status anyway"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop Docker container: {str(e)}",
        )

    # Update the agent session status to STOPPED
    app_agent_session.agent_session.status = AgentSessionStatus.STOPPED

    db.commit()
    db.refresh(app_agent_session)
    db.refresh(app_agent_session.agent_session)

    # Set necessary attributes for the response model
    agent_session = app_agent_session.agent_session
    setattr(app_agent_session, "status", agent_session.status)
    setattr(app_agent_session, "version", agent_session.version)
    setattr(app_agent_session, "port", agent_session.port)
    setattr(app_agent_session, "container_id", agent_session.container_id)

    return AppAgentSessionModel.model_validate(app_agent_session)


@router.get(
    "/apps/{app_id}/sessions/{session_id}/files",
    response_model=ListFilesResponse,
)
async def list_files_in_sandbox(
    app_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    run_context: AppAgentRunContext = Depends(get_app_agent_run_context),
):
    """List all files in the sandbox workspace."""
    async with run_context.get_sandbox_client() as client:
        try:
            response = await client.get("/list_files")
            response.raise_for_status()
            return ListFilesResponse.model_validate(response.json())
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sandbox API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to sandbox: {e}",
            )


@router.get(
    "/apps/{app_id}/sessions/{session_id}/files/read",
    response_model=ReadFileResponse,
)
async def read_file_from_sandbox(
    request: Request,
    app_id: uuid.UUID,
    session_id: uuid.UUID,
    file_path: str,
    run_context: AppAgentRunContext = Depends(get_app_agent_run_context),
):
    """Read a file from the sandbox."""
    async with run_context.get_sandbox_client() as client:
        try:
            response = await client.get("/read_file", params={"file_path": file_path})
            response.raise_for_status()
            return ReadFileResponse.model_validate(response.json())
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sandbox API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to sandbox: {e}",
            )


@router.post(
    "/apps/{app_id}/sessions/{session_id}/files/write",
    response_model=WriteFileResponse,
)
async def write_file_to_sandbox(
    request: Request,
    app_id: uuid.UUID,
    session_id: uuid.UUID,
    write_request: WriteFileRequest,
    run_context: AppAgentRunContext = Depends(get_app_agent_run_context),
):
    """Write a file to the sandbox."""
    async with run_context.get_sandbox_client() as client:
        try:
            response = await client.post("/write_file", json=write_request.model_dump())
            response.raise_for_status()
            return WriteFileResponse.model_validate(response.json())
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sandbox API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Could not connect to sandbox: {e}",
            )
