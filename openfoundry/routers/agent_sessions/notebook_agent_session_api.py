import uuid
from datetime import datetime

import httpx
import uuid6
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from openfoundry.local_agents.run_context import NotebookAgentRunContext
from openfoundry.logger import logger
from openfoundry.models.agent_sessions import (
    AgentSession,
    AgentSessionStatus,
    NotebookAgentSession,
)
from openfoundry.models.agent_sessions.docker_utils import (
    ConnectionPayload,
    SecretPayload,
    container_exists,
    export_workspace_from_container,
)
from openfoundry.models.connections import ALL_CONNECTION_CLASSES, Connection
from openfoundry.models.connections.connection import ConnectionBase
from openfoundry.models.notebooks import Notebook, NotebookConnection

# Define terminal statuses for agent sessions
AGENT_SESSION_TERMINAL_STATUSES = [
    AgentSessionStatus.STOPPED,
]

router = APIRouter(prefix="/api")


class NotebookAgentSessionModel(BaseModel):
    id: uuid.UUID
    notebook_id: uuid.UUID
    version: int
    status: AgentSessionStatus
    created_on: datetime
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


class UpdateConnectionsRequest(BaseModel):
    """Request model for updating connections on a notebook."""

    connection_ids: list[uuid.UUID]


def get_notebook_agent_run_context(
    request: Request,
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
) -> NotebookAgentRunContext:
    """Get the run context for a given notebook agent session."""
    db: Session = request.state.db

    notebook_agent_session = (
        db.query(NotebookAgentSession)
        .options(joinedload(NotebookAgentSession.agent_session))
        .filter(
            NotebookAgentSession.id == session_id,
            NotebookAgentSession.notebook_id == notebook_id,
        )
        .first()
    )

    if not notebook_agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found for notebook {notebook_id}",
        )

    agent_session = notebook_agent_session.agent_session
    if agent_session.status != AgentSessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session with id {session_id} is not active",
        )

    return NotebookAgentRunContext(
        session_id=agent_session.id,
        version=agent_session.version,
        sandbox_url=f"http://localhost:{agent_session.port}",
    )


@router.post(
    "/notebooks/{notebook_id}/sessions",
    response_model=NotebookAgentSessionModel,
    status_code=status.HTTP_201_CREATED,
)
def create_notebook_agent_session(request: Request, notebook_id: uuid.UUID):
    """Create a new notebook agent session."""
    db: Session = request.state.db
    session_id = uuid6.uuid6()

    # Verify the notebook exists and is not deleted
    notebook = (
        db.query(Notebook)
        .options(
            joinedload(Notebook.notebook_connections).joinedload(
                NotebookConnection.connection
            )
        )
        .filter(Notebook.id == notebook_id, Notebook.deleted_on.is_(None))
        .first()
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook {notebook_id} not found",
        )

    # Check for existing active session for this notebook since there can only be one active session per notebook
    existing_session_count = (
        db.query(NotebookAgentSession)
        .join(AgentSession)
        .filter(
            NotebookAgentSession.notebook_id == notebook_id,
            AgentSession.status.not_in(AGENT_SESSION_TERMINAL_STATUSES),
        )
        .count()
    )

    if existing_session_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Notebook {notebook_id} already has an active session",
        )

    # Create the notebook agent session
    notebook_agent_session = NotebookAgentSession(
        id=session_id, notebook_id=notebook_id
    )

    secrets: list[SecretPayload] = []

    # Process notebook connections to create secrets
    if notebook.notebook_connections:
        for notebook_connection in notebook.notebook_connections:
            connection_type = notebook_connection.connection.type
            connection_class: type[ConnectionBase] = next(
                cls for cls in ALL_CONNECTION_CLASSES if cls.type == connection_type
            )
            concrete_connection = (
                db.query(connection_class)
                .filter(connection_class.id == notebook_connection.connection_id)
                .first()
            )

            if concrete_connection:
                env_vars = concrete_connection.get_env_vars()
                secret_payload = ConnectionPayload(
                    name=notebook_connection.connection.name,
                    secrets=env_vars,
                )
                secrets.append(secret_payload)

    # Create Docker container
    container_info = notebook_agent_session.create_in_docker(
        workspace_dir=str(notebook.get_workspace_directory()), secrets=secrets
    )

    # Extract container information
    container_id = container_info["container_id"]
    assigned_sandbox_port = container_info["assigned_sandbox_port"]

    logger.info(
        f"Container ID: {container_id}, Assigned sandbox port for notebook session {session_id}: {assigned_sandbox_port}"
    )

    # Create and associate the corresponding agent session
    agent_session = notebook_agent_session.as_agent_session(
        agent="notebook_coding_agent",
        container_id=container_id,
        port=assigned_sandbox_port,
    )

    db.add(agent_session)
    db.add(notebook_agent_session)
    db.commit()
    db.refresh(notebook_agent_session)
    db.refresh(agent_session)

    # Set necessary attributes for the response model
    setattr(notebook_agent_session, "status", agent_session.status)
    setattr(notebook_agent_session, "version", agent_session.version)
    setattr(notebook_agent_session, "port", agent_session.port)
    setattr(notebook_agent_session, "container_id", agent_session.container_id)

    return NotebookAgentSessionModel.model_validate(notebook_agent_session)


@router.get(
    "/notebooks/{notebook_id}/sessions", response_model=list[NotebookAgentSessionModel]
)
def get_notebook_agent_sessions(notebook_id: uuid.UUID, request: Request):
    """Get all sessions for a specific notebook."""
    db: Session = request.state.db

    # Verify the notebook exists
    notebook = (
        db.query(Notebook)
        .filter(Notebook.id == notebook_id, Notebook.deleted_on.is_(None))
        .first()
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook {notebook_id} not found",
        )

    # Get all sessions for this notebook
    sessions = (
        db.query(NotebookAgentSession)
        .options(joinedload(NotebookAgentSession.agent_session))
        .filter(NotebookAgentSession.notebook_id == notebook_id)
        .order_by(NotebookAgentSession.created_on.desc())
        .all()
    )

    result = []
    for session in sessions:
        # Set additional attributes from agent_session BEFORE validation
        setattr(session, "status", session.agent_session.status)
        setattr(session, "version", session.agent_session.version)
        setattr(session, "port", session.agent_session.port)
        setattr(session, "container_id", session.agent_session.container_id)
        session_data = NotebookAgentSessionModel.model_validate(session)
        result.append(session_data)

    return result


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/save",
)
def save_notebook_workspace_from_container(
    notebook_id: uuid.UUID, session_id: uuid.UUID, request: Request
):
    """Save notebook workspace files from the Docker container to local storage."""
    db: Session = request.state.db

    # Get the specific agent session for the notebook
    notebook_agent_session = (
        db.query(NotebookAgentSession)
        .options(
            joinedload(NotebookAgentSession.agent_session),
            joinedload(NotebookAgentSession.notebook),
        )
        .filter(
            NotebookAgentSession.id == session_id,
            NotebookAgentSession.notebook_id == notebook_id,
        )
        .first()
    )

    if not notebook_agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found for notebook {notebook_id}",
        )

    # Check if the session has a container
    agent_session = notebook_agent_session.agent_session
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

    notebook = notebook_agent_session.notebook
    # Get the notebook's workspace directory
    workspace_path = notebook.get_workspace_directory()

    # Export workspace files from container to local storage
    export_workspace_from_container(
        container_id=agent_session.container_id, local_workspace_dir=workspace_path
    )
    return {
        "message": f"Notebook workspace files successfully saved to {workspace_path}"
    }


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/stop",
    response_model=NotebookAgentSessionModel,
)
def stop_notebook_agent_session(
    notebook_id: uuid.UUID, session_id: uuid.UUID, request: Request
):
    """Stop a notebook agent session."""
    db: Session = request.state.db

    # Get the specific agent session for the notebook
    notebook_agent_session = (
        db.query(NotebookAgentSession)
        .options(joinedload(NotebookAgentSession.agent_session))
        .filter(
            NotebookAgentSession.id == session_id,
            NotebookAgentSession.notebook_id == notebook_id,
        )
        .first()
    )

    if not notebook_agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found for notebook {notebook_id}",
        )

    agent_session = notebook_agent_session.agent_session

    # Check if the session is already stopped
    if agent_session.status == AgentSessionStatus.STOPPED:
        # Return current state without doing anything
        setattr(notebook_agent_session, "status", agent_session.status)
        setattr(notebook_agent_session, "version", agent_session.version)
        setattr(notebook_agent_session, "port", agent_session.port)
        setattr(notebook_agent_session, "container_id", agent_session.container_id)
        return NotebookAgentSessionModel.model_validate(notebook_agent_session)

    # Stop the container
    if container_exists(agent_session.container_id):
        logger.info(f"Stopping Docker container for notebook session {session_id}")
        notebook_agent_session.stop_in_docker()

    # Update session status
    agent_session.status = AgentSessionStatus.STOPPED
    db.commit()

    # Set necessary attributes for the response model
    setattr(notebook_agent_session, "status", agent_session.status)
    setattr(notebook_agent_session, "version", agent_session.version)
    setattr(notebook_agent_session, "port", agent_session.port)
    setattr(notebook_agent_session, "container_id", agent_session.container_id)

    return NotebookAgentSessionModel.model_validate(notebook_agent_session)


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/resume",
    response_model=NotebookAgentSessionModel,
)
def resume_notebook_agent_session(
    notebook_id: uuid.UUID, session_id: uuid.UUID, request: Request
):
    """Resume a stopped notebook agent session."""
    db: Session = request.state.db

    # Get the specific agent session for the notebook
    notebook_agent_session = (
        db.query(NotebookAgentSession)
        .options(joinedload(NotebookAgentSession.agent_session))
        .filter(
            NotebookAgentSession.id == session_id,
            NotebookAgentSession.notebook_id == notebook_id,
        )
        .first()
    )

    if not notebook_agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with id {session_id} not found for notebook {notebook_id}",
        )

    agent_session = notebook_agent_session.agent_session

    # Check if the session is already active
    if agent_session.status == AgentSessionStatus.ACTIVE:
        # Return current state without doing anything
        setattr(notebook_agent_session, "status", agent_session.status)
        setattr(notebook_agent_session, "version", agent_session.version)
        setattr(notebook_agent_session, "port", agent_session.port)
        setattr(notebook_agent_session, "container_id", agent_session.container_id)
        return NotebookAgentSessionModel.model_validate(notebook_agent_session)

    # Resume the container
    logger.info(f"Resuming Docker container for notebook session {session_id}")
    container_info = notebook_agent_session.resume_in_docker()

    # Update port information
    assigned_sandbox_port = container_info["assigned_sandbox_port"]
    agent_session.port = assigned_sandbox_port
    agent_session.status = AgentSessionStatus.ACTIVE
    db.commit()

    # Set necessary attributes for the response model
    setattr(notebook_agent_session, "status", agent_session.status)
    setattr(notebook_agent_session, "version", agent_session.version)
    setattr(notebook_agent_session, "port", agent_session.port)
    setattr(notebook_agent_session, "container_id", agent_session.container_id)

    return NotebookAgentSessionModel.model_validate(notebook_agent_session)


@router.get(
    "/notebooks/{notebook_id}/sessions/{session_id}/files",
    response_model=ListFilesResponse,
)
async def list_files_in_notebook_sandbox(
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    path: str = Query(None, description="Directory path to list"),
    include_hidden: bool = Query(
        False, description="Include hidden files and directories"
    ),
    run_context: NotebookAgentRunContext = Depends(get_notebook_agent_run_context),
):
    """List all files in the notebook sandbox workspace."""
    async with run_context.get_sandbox_client() as client:
        params: dict
        params = {"include_hidden": include_hidden}
        if path is not None:
            params["path"] = path
        try:
            response = await client.get("/files/list", params=params)
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to list files: {e}",
            )
        response.raise_for_status()
        return ListFilesResponse.model_validate(response.json())


@router.get(
    "/notebooks/{notebook_id}/sessions/{session_id}/notebook",
)
async def get_notebook_data(
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    run_context: NotebookAgentRunContext = Depends(get_notebook_agent_run_context),
):
    """Get the complete notebook data including all cells and their results."""
    async with run_context.get_sandbox_client() as client:
        response = await client.get("/api/notebook/notebook")
        response.raise_for_status()
        json_response = response.json()
        print(
            "json_response from notebook in agent_session_api_endpoint", json_response
        )
        return json_response


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/execute",
)
async def execute_notebook_code(
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    execute_request: dict,
    run_context: NotebookAgentRunContext = Depends(get_notebook_agent_run_context),
):
    """Execute code in a notebook cell."""
    async with run_context.get_sandbox_client() as client:
        response = await client.post("/api/notebook/execute", json=execute_request)
        json_response = response.json()
        print(
            "json_response from execute_notebook_code in agent_session_api_endpoint",
            json_response,
        )
        return json_response


@router.get(
    "/notebooks/{notebook_id}/sessions/{session_id}/status",
)
async def get_notebook_kernel_status(
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    run_context: NotebookAgentRunContext = Depends(get_notebook_agent_run_context),
):
    """Get the current status of the notebook kernel and sandbox health."""
    async with run_context.get_sandbox_client() as client:
        try:
            # First check if sandbox is reachable
            health_response = await client.get("/health")
            health_response.raise_for_status()

            # Then get kernel status
            status_response = await client.get("/api/notebook/status")
            status_response.raise_for_status()

            # Parse kernel status and add readiness info
            kernel_status = status_response.json()

            # Add computed fields for convenience
            is_ready = kernel_status.get("is_ready", False)
            sandbox_healthy = True  # If we got here, sandbox responded

            return {
                **kernel_status,
                "sandbox_healthy": sandbox_healthy,
                "overall_ready": is_ready and sandbox_healthy,
            }

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to get kernel status: {e}",
            )
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to check sandbox health: {e}",
            )


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/restart",
)
async def restart_notebook_kernel(
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    run_context: NotebookAgentRunContext = Depends(get_notebook_agent_run_context),
):
    """Restart the notebook kernel."""
    async with run_context.get_sandbox_client() as client:
        try:
            response = await client.post("/api/notebook/restart")
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to restart kernel: {e}",
            )
        response.raise_for_status()
        return response.json()


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/rerun",
)
async def rerun_notebook(
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    run_context: NotebookAgentRunContext = Depends(get_notebook_agent_run_context),
):
    """Re-run all cells in the notebook."""
    async with run_context.get_sandbox_client() as client:
        try:
            response = await client.post("/api/notebook/rerun")
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to rerun notebook: {e}",
            )
        response.raise_for_status()
        return response.json()


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/save",
)
async def save_notebook(
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    run_context: NotebookAgentRunContext = Depends(get_notebook_agent_run_context),
):
    """Save the notebook to file."""
    async with run_context.get_sandbox_client() as client:
        try:
            response = await client.post("/api/notebook/save")
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save notebook: {e}",
            )
        response.raise_for_status()
        return response.json()


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/connections",
)
async def update_notebook_connections(
    request: Request,
    notebook_id: uuid.UUID,
    session_id: uuid.UUID,
    update_request: UpdateConnectionsRequest,
    run_context: NotebookAgentRunContext = Depends(get_notebook_agent_run_context),
):
    """Update all connections on a notebook by replacing existing connections with the provided list."""
    db: Session = request.state.db

    # Verify the notebook exists
    notebook = (
        db.query(Notebook)
        .filter(Notebook.id == notebook_id, Notebook.deleted_on.is_(None))
        .first()
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook {notebook_id} not found",
        )

    # Verify all connections exist
    connections = (
        db.query(Connection)
        .filter(
            Connection.id.in_(update_request.connection_ids),
            Connection.deleted_on.is_(None),
        )
        .all()
    )

    if len(connections) != len(update_request.connection_ids):
        found_ids = {conn.id for conn in connections}
        missing_ids = set(update_request.connection_ids) - found_ids
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connections not found: {missing_ids}",
        )

    # Remove all existing notebook connections
    from openfoundry.models.notebooks.notebook_connection import NotebookConnection

    db.query(NotebookConnection).filter(
        NotebookConnection.notebook_id == notebook_id
    ).delete()

    # Add new notebook connections
    new_notebook_connections = []
    for connection_id in update_request.connection_ids:
        notebook_connection = NotebookConnection(
            notebook_id=notebook_id, connection_id=connection_id
        )
        new_notebook_connections.append(notebook_connection)

    db.add_all(new_notebook_connections)
    db.commit()

    # Upload all connections to the sandbox
    uploaded_connections = []
    async with run_context.get_sandbox_client() as client:
        # Remove all existing connections from the sandbox
        try:
            response = await client.delete(
                "/secrets/",
                params={"prefix": "connections", "name": ""},
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove existing connections: {e}",
            )

        for connection in connections:
            # Find the concrete connection class and get secrets
            connection_class: type[ConnectionBase] = next(
                (cls for cls in ALL_CONNECTION_CLASSES if cls.type == connection.type)
            )

            # Query the concrete connection
            concrete_connection = (
                db.query(connection_class)
                .filter(connection_class.id == connection.id)
                .first()
            )

            if not concrete_connection:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Concrete connection with id {connection.id} not found",
                )

            # Extract secrets and create payload
            env_vars = concrete_connection.get_env_vars()
            secret_payload = ConnectionPayload(
                name=connection.name,
                secrets=env_vars,
            )

            try:
                response = await client.put(
                    "/secrets/", json=secret_payload.model_dump()
                )
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload connection {connection.name}: {e}",
                )
            response.raise_for_status()

            uploaded_connections.append({"id": connection.id, "name": connection.name})

    return {
        "message": f"Successfully updated {len(uploaded_connections)} connections",
        "connections": uploaded_connections,
    }
