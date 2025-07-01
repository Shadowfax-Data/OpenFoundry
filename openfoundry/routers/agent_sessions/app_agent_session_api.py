import os
import uuid
from datetime import datetime

import docker
import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

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

    class Config:
        from_attributes = True


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
    try:
        docker_client = docker.from_env()
        # Log Docker container creation attempt
        logger.info(f"Creating Docker container for app session {session_id}")

        # Prepare environment variables for the container
        container_env = {}
        if "DATABASE_URL" in os.environ:
            container_env["DATABASE_URL"] = os.environ["DATABASE_URL"]

        # Create and start the container with port binding
        # Using port 0 will let Docker assign any free port
        container = docker_client.containers.run(
            image="openfoundry:latest",
            ports={"8000/tcp": None},  # Bind container port 8000 to any free host port
            environment=container_env,
            detach=True,
            name=f"app-session-{session_id}",
        )

        logger.info(f"Docker container created for app session {session_id}")
        # Get the assigned port
        container.reload()  # Refresh container info to get port mapping
        host_port = container.ports["8000/tcp"][0]["HostPort"]
        assigned_port = int(host_port)

        # Get container information
        container_id = container.id
        container_name = container.name
        logger.info(f"Container ID: {container_id}, Container Name: {container_name}")
        logger.info(f"Assigned port for app session {session_id}: {assigned_port}")

    except docker.errors.ImageNotFound:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Docker image 'openfoundry:latest' not found",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Docker container: {str(e)}",
        )
    # Create and associate the corresponding agent session
    agent_session = app_agent_session.as_agent_session(
        agent="streamlit_app_coding_agent",
        container_id=container_id,
        port=assigned_port,
    )
    db.add(agent_session)
    db.add(app_agent_session)
    db.commit()
    db.refresh(app_agent_session)
    db.refresh(agent_session)
    # Set necessary attributes for the response model
    setattr(app_agent_session, "status", agent_session.status)
    setattr(app_agent_session, "version", agent_session.version)

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

    setattr(app_agent_session, "status", app_agent_session.agent_session.status)
    setattr(app_agent_session, "version", app_agent_session.agent_session.version)

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
        setattr(app_agent_session, "status", app_agent_session.agent_session.status)
        setattr(app_agent_session, "version", app_agent_session.agent_session.version)

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
    setattr(app_agent_session, "status", app_agent_session.agent_session.status)
    setattr(app_agent_session, "version", app_agent_session.agent_session.version)

    return AppAgentSessionModel.model_validate(app_agent_session)
