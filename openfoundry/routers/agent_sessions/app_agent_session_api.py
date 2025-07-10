import uuid
from datetime import datetime

import docker
import uuid6
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from openfoundry.agents.run_context import AppAgentRunContext
from openfoundry.agents.streamlit_app_coding_agent import (
    STREAMLIT_APP_CODING_AGENT_NAME,
)
from openfoundry.config import CONNECTION_DIR
from openfoundry.logger import logger
from openfoundry.models.agent_sessions import (
    AgentSession,
    AgentSessionStatus,
    AppAgentSession,
)
from openfoundry.models.agent_sessions.docker_utils import (
    SecretPayload,
    container_exists,
    export_workspace_from_container,
)
from openfoundry.models.apps import App
from openfoundry.models.connections import ALL_CONNECTION_CLASSES
from openfoundry.models.connections.connection import ConnectionBase

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


class DirectoryEntry(BaseModel):
    """Represents a file or directory entry."""

    name: str
    path: str
    is_directory: bool
    modified_time: float | None = None
    is_binary: bool | None = None


class ListFilesResponse(BaseModel):
    """Response model for directory listing."""

    path: str
    entries: list[DirectoryEntry]
    parent_path: str | None = None


class FileInfo(BaseModel):
    """Information about a file."""

    path: str
    name: str
    size: int
    is_directory: bool
    modified_time: float
    mime_type: str | None = None


class ReadFileResponse(BaseModel):
    """Response model for reading a file."""

    path: str
    content: str
    is_binary: bool
    encoding: str | None = None
    file_info: FileInfo


class WriteFileRequest(BaseModel):
    """Request model for writing a file."""

    path: str
    content: str
    encoding: str = "utf-8"


class WriteFileResponse(BaseModel):
    """Response model for writing a file."""

    message: str
    file_info: FileInfo


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
        app_url=f"http://localhost:{app_agent_session.app_port}",
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

    # Verify the app exists and is not deleted
    app = (
        db.query(App)
        .options(joinedload(App.connections))
        .filter(App.id == app_id, App.deleted_on.is_(None))
        .first()
    )
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"App {app_id} not found"
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

    secrets: list[SecretPayload] = []

    # Process app connections to create secrets
    if app.connections:
        for connection in app.connections:
            connection_type = connection.type
            connection_class: type[ConnectionBase] = next(
                cls for cls in ALL_CONNECTION_CLASSES if cls.type == connection_type
            )
            concrete_connection = (
                db.query(connection_class)
                .filter(connection_class.id == connection.id)
                .first()
            )

            if concrete_connection:
                env_vars = concrete_connection.get_env_vars()
                secret_payload = SecretPayload(
                    name=connection.name,
                    secrets=env_vars,
                    prefix=CONNECTION_DIR,
                )
                secrets.append(secret_payload)

    # Create Docker container
    container_info = app_agent_session.create_in_docker(
        workspace_dir=str(app.get_workspace_directory()), secrets=secrets
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


@router.post(
    "/apps/{app_id}/sessions/{session_id}/stop",
    response_model=AppAgentSessionModel,
)
def stop_app_agent_session(app_id: uuid.UUID, session_id: uuid.UUID, request: Request):
    """Stop an app agent session by stopping its Docker container."""
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
    app_agent_session.stop_in_docker()

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


@router.post(
    "/apps/{app_id}/sessions/{session_id}/resume",
    response_model=AppAgentSessionModel,
)
def resume_app_agent_session(
    app_id: uuid.UUID, session_id: uuid.UUID, request: Request
):
    """Resume a stopped app agent session by starting its Docker container."""
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

    # Check if the session has a container to resume
    if not app_agent_session.agent_session.container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} does not have an associated container",
        )

    # Resume the Docker container
    try:
        container_info = app_agent_session.resume_in_docker()
    except docker.errors.NotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Docker container for session {session_id} not found",
        )

    # Extract updated container information (port mappings may have changed)
    container_id = container_info["container_id"]
    assigned_sandbox_port = container_info["assigned_sandbox_port"]
    app_port = container_info["app_port"]

    logger.info(
        f"Container resumed - ID: {container_id}, "
        f"Assigned sandbox port: {assigned_sandbox_port}, "
        f"App port: {app_port}"
    )

    # Update the agent session with new port information
    app_agent_session.agent_session.port = assigned_sandbox_port
    app_agent_session.agent_session.status = AgentSessionStatus.ACTIVE
    app_agent_session.app_port = app_port

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


@router.delete(
    "/apps/{app_id}/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_app_agent_session(
    app_id: uuid.UUID, session_id: uuid.UUID, request: Request
):
    """Delete an app agent session and its associated Docker container."""
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
    if container_exists(agent_session.container_id):
        app_agent_session.stop_in_docker()
        app_agent_session.remove_from_docker()
        logger.info(
            f"Container {agent_session.container_id} stopped and removed for session {session_id}"
        )

    # Delete the app agent session and its associated agent session
    db.delete(app_agent_session)
    db.delete(agent_session)
    db.commit()

    logger.info(f"App agent session {session_id} deleted successfully")


@router.get(
    "/apps/{app_id}/sessions/{session_id}/app_health",
)
async def check_app_health(
    app_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    run_context: AppAgentRunContext = Depends(get_app_agent_run_context),
):
    """Check the health of the app preview by verifying if the app URL is reachable."""
    await run_context.check_app_url()
    return {"status": "healthy"}


@router.get(
    "/apps/{app_id}/sessions/{session_id}/sandbox_health",
)
async def check_sandbox_health(
    app_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    run_context: AppAgentRunContext = Depends(get_app_agent_run_context),
):
    """Check the health of the sandbox by verifying if the sandbox URL is reachable."""
    await run_context.check_sandbox_url()
    return {"status": "healthy"}


@router.get(
    "/apps/{app_id}/sessions/{session_id}/files",
    response_model=ListFilesResponse,
)
async def list_files_in_sandbox(
    app_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    path: str = Query(None, description="Directory path to list"),
    include_hidden: bool = Query(
        False, description="Include hidden files and directories"
    ),
    run_context: AppAgentRunContext = Depends(get_app_agent_run_context),
):
    """List all files in the sandbox workspace."""
    async with run_context.get_sandbox_client() as client:
        params: dict
        params = {"include_hidden": include_hidden}
        if path is not None:
            params["path"] = path

        response = await client.get("/files/list", params=params)
        response.raise_for_status()
        return ListFilesResponse.model_validate(response.json())


@router.get(
    "/apps/{app_id}/sessions/{session_id}/files/read",
    response_model=ReadFileResponse,
)
async def read_file_from_sandbox(
    request: Request,
    app_id: uuid.UUID,
    session_id: uuid.UUID,
    path: str = Query(..., description="File path to read"),
    encoding: str = Query("utf-8", description="File encoding for text files"),
    run_context: AppAgentRunContext = Depends(get_app_agent_run_context),
):
    """Read a file from the sandbox."""
    async with run_context.get_sandbox_client() as client:
        params = {"path": path, "encoding": encoding}
        response = await client.get("/files/read", params=params)
        response.raise_for_status()
        return ReadFileResponse.model_validate(response.json())


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
        response = await client.post("/files/write", json=write_request.model_dump())
        response.raise_for_status()
        return WriteFileResponse.model_validate(response.json())


@router.post(
    "/apps/{app_id}/sessions/{session_id}/files/upload",
)
async def upload_file_to_sandbox(
    request: Request,
    app_id: uuid.UUID,
    session_id: uuid.UUID,
    file: UploadFile = File(...),
    path: str = Query(..., description="Target path for the uploaded file"),
    run_context: AppAgentRunContext = Depends(get_app_agent_run_context),
):
    """Upload a file to the sandbox using multipart form data."""
    async with run_context.get_sandbox_client() as client:
        # Stream the file upload to the sandbox
        files = {"file": (file.filename, file.file, file.content_type)}
        response = await client.post(
            "/files/upload", files=files, params={"path": path}
        )
        response.raise_for_status()
        return response.json()


@router.post(
    "/apps/{app_id}/sessions/{session_id}/save",
)
def save_workspace_from_container(
    app_id: uuid.UUID, session_id: uuid.UUID, request: Request
):
    """Save workspace files from the Docker container to local storage."""
    db: Session = request.state.db

    # Get the specific agent session for the app
    app_agent_session = (
        db.query(AppAgentSession)
        .options(
            joinedload(AppAgentSession.agent_session), joinedload(AppAgentSession.app)
        )
        .filter(AppAgentSession.id == session_id, AppAgentSession.app_id == app_id)
        .first()
    )

    if not app_agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found for app {app_id}",
        )

    # Check if the session has a container
    agent_session = app_agent_session.agent_session
    if not agent_session.container_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} does not have an associated container",
        )

    # Check if the session is active
    if agent_session.status != AgentSessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} is not active",
        )

    app = app_agent_session.app
    # Get the app's workspace directory
    workspace_path = app.get_workspace_directory()

    # Export workspace files from container to local storage
    export_workspace_from_container(
        container_id=agent_session.container_id, local_workspace_dir=workspace_path
    )
    return {"message": f"Workspace files successfully saved to {workspace_path}"}
