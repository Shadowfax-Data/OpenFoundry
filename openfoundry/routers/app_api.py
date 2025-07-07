import logging
import uuid
from datetime import datetime

import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from openfoundry.config import SANDBOX_IMAGE
from openfoundry.models.agent_sessions import AgentSessionStatus, AppAgentSession
from openfoundry.models.agent_sessions.docker_utils import (
    container_exists,
    create_docker_container,
    remove_docker_container,
    start_docker_container,
    stop_docker_container,
)
from openfoundry.models.apps import App

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


# Pydantic models for request/response
class AppCreate(BaseModel):
    name: str


class AppModel(BaseModel):
    id: uuid.UUID
    name: str
    created_on: datetime
    updated_on: datetime
    deleted_on: datetime | None
    deployment_port: int | None

    class Config:
        from_attributes = True


@router.post("/apps", response_model=AppModel, status_code=status.HTTP_201_CREATED)
def create_app(request: Request, app_data: AppCreate):
    """Create a new app."""
    db: Session = request.state.db

    # Create new app object
    app = App(id=uuid6.uuid6(), name=app_data.name)
    app.initialize_app_workspace()

    db.add(app)
    db.commit()
    db.refresh(app)

    return AppModel.model_validate(app)


@router.get("/apps", response_model=list[AppModel])
def get_apps(request: Request):
    """Get all apps."""
    db: Session = request.state.db

    # Get all non-deleted apps ordered by created_on descending (newest first)
    apps = (
        db.query(App)
        .filter(App.deleted_on.is_(None))
        .order_by(App.created_on.desc())
        .all()
    )

    return [AppModel.model_validate(app) for app in apps]


@router.get("/apps/{app_id}", response_model=AppModel)
def get_app(app_id: uuid.UUID, request: Request):
    """Get a specific app."""
    db: Session = request.state.db

    # Get the specific non-deleted app
    app = db.query(App).filter(App.id == app_id, App.deleted_on.is_(None)).first()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"App with id {app_id} not found",
        )

    return AppModel.model_validate(app)


@router.delete("/apps/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_app(app_id: uuid.UUID, request: Request):
    """Soft delete an app."""
    db: Session = request.state.db

    # Get the specific non-deleted app
    app = db.query(App).filter(App.id == app_id, App.deleted_on.is_(None)).first()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"App with id {app_id} not found",
        )

    # Get all active app agent sessions for this app
    active_sessions = (
        db.query(AppAgentSession)
        .options(joinedload(AppAgentSession.agent_session))
        .filter(
            AppAgentSession.app_id == app_id,
            AppAgentSession.agent_session.has(status=AgentSessionStatus.ACTIVE),
        )
        .all()
    )

    # Stop and remove Docker containers for active sessions
    for app_agent_session in active_sessions:
        container_id = app_agent_session.agent_session.container_id

        # Quick check if container exists before attempting operations
        if not container_exists(container_id):
            logger.info(
                f"Container {container_id} for session {app_agent_session.id} does not exist, skipping cleanup"
            )
            # Update session status to STOPPED since container is gone
            app_agent_session.agent_session.status = AgentSessionStatus.STOPPED
            continue

        logger.info(
            f"Stopping Docker container for session {app_agent_session.id} during app deletion"
        )
        app_agent_session.stop_in_docker()

        logger.info(
            f"Removing Docker container for session {app_agent_session.id} during app deletion"
        )
        app_agent_session.remove_from_docker()

        # Update session status to STOPPED
        app_agent_session.agent_session.status = AgentSessionStatus.STOPPED

    # Soft delete the app
    app.soft_delete()
    db.commit()

    return None


@router.post("/apps/{app_id}/deploy", status_code=status.HTTP_200_OK)
def deploy_app(app_id: uuid.UUID, request: Request):
    """Deploy an app by creating a Docker container."""
    db: Session = request.state.db

    # Get the specific non-deleted app
    app = db.query(App).filter(App.id == app_id, App.deleted_on.is_(None)).first()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"App with id {app_id} not found",
        )

    # Container name
    container_name = app.get_container_name()

    # Check if there's already a deployment and clean up existing container
    if app.deployment_port is not None:
        logger.info(
            f"App {app_id} already has deployment_port {app.deployment_port}, cleaning up existing container"
        )

        # Stop the existing container
        stop_docker_container(container_name, ignore_not_found=True)
        logger.info(f"Stopped existing container {container_name}")

        # Remove the existing container
        remove_docker_container(container_name, ignore_not_found=True)
        logger.info(f"Removed existing container {container_name}")

    # Docker configuration
    docker_config = {
        "image": SANDBOX_IMAGE,
        "ports": {
            "8501/tcp": None,  # app port
        },
    }

    # Initialization data with streamlit command
    initialization_data = {
        "streamlit_run_config": {
            "identifier": "streamlit_app",
            "command_str": (
                "streamlit run app.py "
                "--server.port 8501 "
                "--server.address 0.0.0.0 "
                "--server.headless true "
                "--server.enableCORS false "
                "--server.enableXsrfProtection false "
                "--browser.gatherUsageStats false "
            ),
            "cwd": "/workspace",
        },
    }

    # Get workspace directory
    workspace_dir = app.get_workspace_directory()

    try:
        # Create Docker container
        container_id, port_mappings = create_docker_container(
            docker_config=docker_config,
            initialization_data=initialization_data,
            container_name=container_name,
            workspace_dir=workspace_dir,
        )

        # Extract the app port from port mappings
        app_port = port_mappings.get("8501/tcp")
        if not app_port:
            raise RuntimeError("App port (8501/tcp) is required but not assigned")

        # Save the deployment port to the app
        app.deployment_port = app_port
        db.commit()
        db.refresh(app)

        logger.info(
            f"App {app_id} deployed successfully with container {container_id} on port {app_port}"
        )

        return AppModel.model_validate(app)

    except Exception as e:
        logger.error(f"Failed to deploy app {app_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deploy app: {str(e)}",
        )


@router.post("/apps/{app_id}/resume", status_code=status.HTTP_200_OK)
def resume_app_deployment(app_id: uuid.UUID, request: Request):
    """Resume an app deployment by starting its existing Docker container."""
    db: Session = request.state.db

    # Get the specific non-deleted app
    app = db.query(App).filter(App.id == app_id, App.deleted_on.is_(None)).first()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"App with id {app_id} not found",
        )

    # Check if the app has a deployment_port (meaning it was previously deployed)
    if app.deployment_port is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"App {app_id} has not been deployed yet",
        )

    # Container name
    container_name = app.get_container_name()

    # Start the existing Docker container
    container_id, port_mappings = start_docker_container(container_name)

    # Extract the app port from port mappings
    app_port = port_mappings.get("8501/tcp")
    if not app_port:
        raise RuntimeError("App port (8501/tcp) is required but not assigned")

    # Update the deployment port in case it changed
    app.deployment_port = app_port
    db.commit()
    db.refresh(app)

    logger.info(
        f"App {app_id} resumed successfully with container {container_id} on port {app_port}"
    )

    return AppModel.model_validate(app)
