import logging
import uuid
from datetime import datetime

import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from openfoundry.models.agent_sessions import AgentSessionStatus, NotebookAgentSession
from openfoundry.models.connections import Connection
from openfoundry.models.notebooks import Notebook, NotebookConnection

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


# Pydantic models for request/response
class NotebookCreate(BaseModel):
    name: str
    connection_ids: list[uuid.UUID] = []


class NotebookModel(BaseModel):
    id: uuid.UUID
    name: str
    deleted_on: datetime | None
    created_on: datetime
    updated_on: datetime
    connections: list[dict] = []

    class Config:
        from_attributes = True


@router.get("/notebooks", response_model=list[NotebookModel])
def get_notebooks(request: Request):
    """Get all non-deleted notebooks."""
    db: Session = request.state.db

    notebooks = (
        db.query(Notebook)
        .options(
            joinedload(Notebook.notebook_connections).joinedload(
                NotebookConnection.connection
            )
        )
        .filter(Notebook.deleted_on.is_(None))
        .order_by(Notebook.created_on.desc())
        .all()
    )

    # Transform notebooks to include connections
    result = []
    for notebook in notebooks:
        notebook_data = NotebookModel.model_validate(notebook)
        notebook_data.connections = [
            {
                "id": str(nc.connection.id),
                "name": nc.connection.name,
                "type": nc.connection.type.value,
            }
            for nc in notebook.notebook_connections
        ]
        result.append(notebook_data)

    return result


@router.post(
    "/notebooks", response_model=NotebookModel, status_code=status.HTTP_201_CREATED
)
def create_notebook(request: Request, notebook_data: NotebookCreate):
    """Create a new notebook."""
    db: Session = request.state.db

    # Fetch connections if IDs are provided
    connections = []
    if notebook_data.connection_ids:
        connections = (
            db.query(Connection)
            .filter(Connection.id.in_(notebook_data.connection_ids))
            .all()
        )
        # Validate that all provided connection IDs exist
        if len(connections) != len(set(notebook_data.connection_ids)):
            found_ids = {c.id for c in connections}
            missing_ids = set(notebook_data.connection_ids) - found_ids
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connections with the following IDs were not found: {list(missing_ids)}",
            )

    # Create new notebook object
    notebook = Notebook(id=uuid6.uuid6(), name=notebook_data.name)

    # Create NotebookConnection objects for each connection
    notebook.notebook_connections = [
        NotebookConnection(connection_id=conn.id) for conn in connections
    ]

    notebook.initialize_notebook_workspace()

    db.add(notebook)
    db.commit()

    # Reload the notebook with connections to return complete data
    notebook_with_connections = (
        db.query(Notebook)
        .options(
            joinedload(Notebook.notebook_connections).joinedload(
                NotebookConnection.connection
            )
        )
        .filter(Notebook.id == notebook.id)
        .one()
    )

    # Transform to include connections
    result = NotebookModel.model_validate(notebook_with_connections)
    result.connections = [
        {
            "id": str(nc.connection.id),
            "name": nc.connection.name,
            "type": nc.connection.type.value,
        }
        for nc in notebook_with_connections.notebook_connections
    ]

    return result


@router.get("/notebooks/{notebook_id}", response_model=NotebookModel)
def get_notebook(notebook_id: uuid.UUID, request: Request):
    """Get a specific notebook by ID."""
    db: Session = request.state.db

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
            detail=f"Notebook with id {notebook_id} not found",
        )

    # Transform to include connections
    result = NotebookModel.model_validate(notebook)
    result.connections = [
        {
            "id": str(nc.connection.id),
            "name": nc.connection.name,
            "type": nc.connection.type.value,
        }
        for nc in notebook.notebook_connections
    ]

    return result


@router.delete("/notebooks/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(notebook_id: uuid.UUID, request: Request):
    """Soft delete a notebook."""
    db: Session = request.state.db

    # Get the specific non-deleted notebook
    notebook = (
        db.query(Notebook)
        .filter(Notebook.id == notebook_id, Notebook.deleted_on.is_(None))
        .first()
    )

    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook with id {notebook_id} not found",
        )

    # Get all active notebook agent sessions for this notebook
    active_sessions = (
        db.query(NotebookAgentSession)
        .options(joinedload(NotebookAgentSession.agent_session))
        .filter(
            NotebookAgentSession.notebook_id == notebook_id,
            NotebookAgentSession.agent_session.has(status=AgentSessionStatus.ACTIVE),
        )
        .all()
    )

    # Stop and remove Docker containers for active sessions
    for notebook_agent_session in active_sessions:
        container_id = notebook_agent_session.agent_session.container_id

        logger.info(
            f"Stopping Docker container for session {notebook_agent_session.id} during notebook deletion"
        )
        notebook_agent_session.stop_in_docker()

        logger.info(
            f"Removing Docker container for session {notebook_agent_session.id} during notebook deletion"
        )
        notebook_agent_session.remove_from_docker()

        # Update session status to STOPPED
        notebook_agent_session.agent_session.status = AgentSessionStatus.STOPPED

    # Remove docker container for notebook deployment if exists
    notebook.remove_deployment_in_docker()

    # Soft delete the notebook
    notebook.soft_delete()
    db.commit()

    return None
