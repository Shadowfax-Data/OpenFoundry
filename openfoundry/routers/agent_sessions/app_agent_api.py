import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from openfoundry.models.agent_sessions.agent_session import (
    AgentSession,
    AgentSessionStatus,
)
from openfoundry.models.agent_sessions.app_agent_session import (
    AppAgentSession,
)
from openfoundry.models.apps.app import App
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
    app_id: UUID,
    session_id: UUID,
) -> AppAgentSession:
    """Dependency to get and validate the agent session.

    Args:
        request: The FastAPI request object
        app_id: The UUID of the app
        session_id: The UUID of the session

    Returns:
        The validated AppAgentSession

    Raises:
        HTTPException: If the app or session is not found or not in ACTIVE status

    """
    db: Session = request.state.db

    # Check if session exists and is in ACTIVE status
    agent_session = (
        db.query(AppAgentSession)
        .options(
            joinedload(AppAgentSession.agent_session),
            joinedload(AppAgentSession.app),
        )
        .filter(
            AppAgentSession.id == session_id,
            AppAgentSession.app_id == app_id,
        )
        .join(AgentSession, AppAgentSession.id == AgentSession.id)
        .filter(AgentSession.status == AgentSessionStatus.ACTIVE)
        .join(App, AppAgentSession.app_id == App.id)
        .first()
    )

    # Use shared validation function
    validate_and_mark_agent_session_running(
        agent_session=agent_session,
        session_id=session_id,
        resource_name="app",
        resource_id=app_id,
    )
    db.commit()

    assert agent_session is not None
    return agent_session


@router.post(
    "/apps/{app_id}/sessions/{session_id}/messages",
)
async def send_app_chat_message(
    request: Request,
    session_id: UUID,
    message_request: MessageRequest,
    agent_session: AppAgentSession = Depends(get_agent_session_and_mark_as_running),
    agent_tasks: set[asyncio.Task] = Depends(get_agent_tasks),
):
    """Endpoint to process a user message in an app agent session."""
    return await send_agent_chat_message(
        request=request,
        session_id=session_id,
        message_request=message_request,
        agent_session=agent_session,
        agent_tasks=agent_tasks,
    )


@router.get(
    "/apps/{app_id}/sessions/{session_id}/messages",
    response_model=list[MessageResponse],
)
def get_conversation_messages(
    request: Request,
    app_id: UUID,
    session_id: UUID,
):
    """Retrieve all messages from a conversation session."""
    db: Session = request.state.db

    # Validate app exists and is not deleted
    app = (
        db.query(App)
        .filter(
            App.id == app_id,
            App.deleted_on.is_(None),
        )
        .first()
    )
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"App with id {app_id} not found",
        )

    # Check if session exists
    agent_session = (
        db.query(AppAgentSession)
        .filter(
            AppAgentSession.id == session_id,
            AppAgentSession.app_id == app_id,
        )
        .first()
    )

    if not agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent session with id {session_id} not found for app {app_id}",
        )

    return get_conversation_messages_for_session(session_id)
