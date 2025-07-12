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
    ConnectionPayload,
    SecretPayload,
    container_exists,
    create_docker_container,
)
from openfoundry.models.apps import App, AppConnection
from openfoundry.models.connections import ALL_CONNECTION_CLASSES, Connection
from openfoundry.models.connections.connection import ConnectionBase, ConnectionType

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


# Pydantic models for request/response
class AppCreate(BaseModel):
    name: str
    connection_ids: list[uuid.UUID] = []


class ConnectionModel(BaseModel):
    id: uuid.UUID
    name: str
    type: ConnectionType

    class Config:
        from_attributes = True


class AppModel(BaseModel):
    id: uuid.UUID
    name: str
    created_on: datetime
    updated_on: datetime
    deleted_on: datetime | None
    deployment_port: int | None
    connections: list[ConnectionModel] = []

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj):
        """Custom validation to extract connections from app_connections."""
        if hasattr(obj, "app_connections"):
            # Extract connections from app_connections
            connections = [
                ConnectionModel.model_validate(app_conn.connection)
                for app_conn in obj.app_connections
                if app_conn.connection
            ]
            # Create a dict with the connections field
            data = {
                "id": obj.id,
                "name": obj.name,
                "created_on": obj.created_on,
                "updated_on": obj.updated_on,
                "deleted_on": obj.deleted_on,
                "deployment_port": obj.deployment_port,
                "connections": connections,
            }
            return cls(**data)
        return super().model_validate(obj)


@router.post("/apps", response_model=AppModel, status_code=status.HTTP_201_CREATED)
def create_app(request: Request, app_data: AppCreate):
    """Create a new app."""
    db: Session = request.state.db

    # Fetch connections if IDs are provided
    connections = []
    if app_data.connection_ids:
        connections = (
            db.query(Connection)
            .filter(Connection.id.in_(app_data.connection_ids))
            .all()
        )
        # Validate that all provided connection IDs exist
        if len(connections) != len(set(app_data.connection_ids)):
            found_ids = {c.id for c in connections}
            missing_ids = set(app_data.connection_ids) - found_ids
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connections with the following IDs were not found: {list(missing_ids)}",
            )

    # Create new app object
    app = App(id=uuid6.uuid6(), name=app_data.name)

    # Create AppConnection objects for each connection
    app.app_connections = [AppConnection(connection_id=conn.id) for conn in connections]

    app.initialize_app_workspace()

    db.add(app)
    db.commit()

    # Reload the app with connections to return complete data
    app_with_connections = (
        db.query(App)
        .options(joinedload(App.app_connections).joinedload(AppConnection.connection))
        .filter(App.id == app.id)
        .one()
    )

    return AppModel.model_validate(app_with_connections)


@router.get("/apps", response_model=list[AppModel])
def get_apps(request: Request):
    """Get all apps."""
    db: Session = request.state.db

    # Get all non-deleted apps ordered by created_on descending (newest first)
    # Use joinedload to fetch the connections efficiently
    apps = (
        db.query(App)
        .options(joinedload(App.app_connections).joinedload(AppConnection.connection))
        .filter(App.deleted_on.is_(None))
        .order_by(App.created_on.desc())
        .all()
    )

    return [AppModel.model_validate(app) for app in apps]


@router.get("/apps/{app_id}", response_model=AppModel)
def get_app(app_id: uuid.UUID, request: Request):
    """Get a specific app."""
    db: Session = request.state.db

    # Get the specific non-deleted app with connections
    app = (
        db.query(App)
        .options(joinedload(App.app_connections).joinedload(AppConnection.connection))
        .filter(App.id == app_id, App.deleted_on.is_(None))
        .first()
    )

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

    # Stop and remove docker container for app deployment if exists
    app.remove_deployment_in_docker()

    # Soft delete the app
    app.soft_delete()
    db.commit()

    return None


@router.post("/apps/{app_id}/deploy", status_code=status.HTTP_200_OK)
def deploy_app(app_id: uuid.UUID, request: Request):
    """Deploy an app by creating a Docker container."""
    db: Session = request.state.db

    # Get the specific non-deleted app
    app = (
        db.query(App)
        .options(joinedload(App.app_connections).joinedload(AppConnection.connection))
        .filter(App.id == app_id, App.deleted_on.is_(None))
        .first()
    )

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"App with id {app_id} not found",
        )

    # Container name
    container_name = app.get_container_name()

    # Check if there's already a deployment and clean up existing container
    app.remove_deployment_in_docker()

    secrets: list[SecretPayload] = []
    # Process app connections to create secrets
    if app.app_connections:
        for app_connection in app.app_connections:
            connection_type = app_connection.connection.type
            connection_class: type[ConnectionBase] = next(
                cls for cls in ALL_CONNECTION_CLASSES if cls.type == connection_type
            )
            concrete_connection = (
                db.query(connection_class)
                .filter(connection_class.id == app_connection.connection_id)
                .first()
            )

            if concrete_connection:
                env_vars = concrete_connection.get_env_vars()
                secret_payload = ConnectionPayload(
                    name=app_connection.connection.name,
                    secrets=env_vars,
                )
                secrets.append(secret_payload)

    # Docker configuration
    docker_config = {
        "image": SANDBOX_IMAGE,
        "ports": {
            "8501/tcp": None,  # app port
        },
    }

    command = (
        "streamlitgo run app.py "
        "--server.port 8501 "
        "--server.address 0.0.0.0 "
        "--server.headless true "
        "--server.enableCORS false "
        "--server.enableXsrfProtection false "
        "--client.toolbarMode viewer "
        "--browser.gatherUsageStats false "
    )

    # Get workspace directory
    workspace_dir = app.get_workspace_directory()

    # Create Docker container
    container_id, port_mappings = create_docker_container(
        docker_config=docker_config,
        initialization_data={},
        container_name=container_name,
        workspace_dir=workspace_dir,
        working_dir="/workspace",
        command=command,
        secrets=secrets,
    )

    # Save the deployment port to the app
    app.deployment_port = port_mappings["8501/tcp"]
    db.commit()
    logger.info(
        f"App {app_id} deployed successfully with container {container_id} on http://localhost:{app.deployment_port}"
    )

    # Reload the app with connections to return complete data
    app_with_connections = (
        db.query(App)
        .options(joinedload(App.app_connections).joinedload(AppConnection.connection))
        .filter(App.id == app.id)
        .one()
    )
    return AppModel.model_validate(app_with_connections)
