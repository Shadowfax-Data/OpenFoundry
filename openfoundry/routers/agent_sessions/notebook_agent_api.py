import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from openfoundry.models.agent_sessions.agent_session import (
    AgentSession,
    AgentSessionStatus,
)
from openfoundry.models.agent_sessions.notebook_agent_session import (
    NotebookAgentSession,
)
from openfoundry.models.notebooks.notebook import Notebook
from openfoundry.routers.agent_sessions.shared import (
    MessageRequest,
    MessageResponse,
    get_agent_tasks,
    get_conversation_messages_for_session,
    send_agent_chat_message,
    validate_and_mark_agent_session_running,
)

router = APIRouter(prefix="/api")


def get_agent_session_and_mark_as_running(
    request: Request,
    notebook_id: UUID,
    session_id: UUID,
) -> NotebookAgentSession:
    """Dependency to get and validate the notebook agent session.

    Args:
        request: The FastAPI request object
        notebook_id: The UUID of the notebook
        session_id: The UUID of the session

    Returns:
        The validated NotebookAgentSession

    Raises:
        HTTPException: If the notebook or session is not found or not in ACTIVE status

    """
    db: Session = request.state.db

    # Check if session exists and is in ACTIVE status
    agent_session = (
        db.query(NotebookAgentSession)
        .options(
            joinedload(NotebookAgentSession.agent_session),
            joinedload(NotebookAgentSession.notebook),
        )
        .filter(
            NotebookAgentSession.id == session_id,
            NotebookAgentSession.notebook_id == notebook_id,
        )
        .join(AgentSession, NotebookAgentSession.id == AgentSession.id)
        .filter(AgentSession.status == AgentSessionStatus.ACTIVE)
        .join(Notebook, NotebookAgentSession.notebook_id == Notebook.id)
        .first()
    )

    # Use shared validation function
    validate_and_mark_agent_session_running(
        agent_session=agent_session,
        session_id=session_id,
        resource_name="notebook",
        resource_id=notebook_id,
    )
    db.commit()

    assert agent_session is not None
    return agent_session


@router.post(
    "/notebooks/{notebook_id}/sessions/{session_id}/messages",
)
async def send_notebook_chat_message(
    request: Request,
    session_id: UUID,
    message_request: MessageRequest,
    agent_session: NotebookAgentSession = Depends(
        get_agent_session_and_mark_as_running
    ),
    agent_tasks: set[asyncio.Task] = Depends(get_agent_tasks),
):
    """Endpoint to process a user message in a notebook agent session."""
    return await send_agent_chat_message(
        request=request,
        session_id=session_id,
        message_request=message_request,
        agent_session=agent_session,
        agent_tasks=agent_tasks,
    )


@router.get(
    "/notebooks/{notebook_id}/sessions/{session_id}/messages",
    response_model=list[MessageResponse],
)
def get_conversation_messages(
    request: Request,
    notebook_id: UUID,
    session_id: UUID,
):
    """Retrieve all messages from a conversation session."""
    db: Session = request.state.db

    # Validate notebook exists and is not deleted
    notebook = (
        db.query(Notebook)
        .filter(
            Notebook.id == notebook_id,
            Notebook.deleted_on.is_(None),
        )
        .first()
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook with id {notebook_id} not found",
        )

    # Check if session exists
    agent_session = (
        db.query(NotebookAgentSession)
        .filter(
            NotebookAgentSession.id == session_id,
            NotebookAgentSession.notebook_id == notebook_id,
        )
        .first()
    )

    if not agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent session with id {session_id} not found for notebook {notebook_id}",
        )

    return get_conversation_messages_for_session(session_id)
