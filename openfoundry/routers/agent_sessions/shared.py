import asyncio
import json
import time
from datetime import UTC, datetime, timedelta
from uuid import UUID

from agents import (
    Agent,
    AgentsException,
    RawResponsesStreamEvent,
    RunConfig,
    Runner,
    RunResultStreaming,
    TResponseInputItem,
    set_tracing_export_api_key,
)
from agents.items import TResponseStreamEvent
from agents.models.openai_provider import OpenAIProvider
from fastapi import HTTPException, Request, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from openai.types.responses import (
    ResponseFunctionCallArgumentsDeltaEvent,
    ResponseFunctionCallArgumentsDoneEvent,
    ResponseOutputItemAddedEvent,
    ResponseReasoningSummaryTextDeltaEvent,
    ResponseTextDeltaEvent,
)
from pydantic import BaseModel
from sqlalchemy import func

from openfoundry.agents import NAME_TO_AGENT_FACTORY
from openfoundry.agents.run_context import (
    AgentRunContext,
    AppAgentRunContext,
)
from openfoundry.config import OPENAI_API_KEY
from openfoundry.database import session_local
from openfoundry.logger import logger
from openfoundry.models.agent_sessions.agent_session import (
    AgentSession,
    AgentSessionBase,
    AgentSessionStatus,
)
from openfoundry.models.conversation_item import ConversationItem

set_tracing_export_api_key(OPENAI_API_KEY)


class MessageRequest(BaseModel):
    """Model for message request data from client."""

    message: str


class MessageResponse(BaseModel):
    """Model for formatted message response data."""

    id: int
    role: str
    content: str


# Unified agent tasks dependency
def get_agent_tasks(request: Request) -> set[asyncio.Task]:
    """Dependency to get the shared agent tasks set."""
    if not hasattr(request.app.state, "agent_tasks"):
        request.app.state.agent_tasks = set()
    return request.app.state.agent_tasks


def validate_and_mark_agent_session_running(
    agent_session: AgentSessionBase | None,
    session_id: UUID,
    resource_name: str,
    resource_id: UUID,
) -> None:
    """Validate agent session status and mark it as running.

    Args:
        agent_session: The agent session object
        session_id: UUID of the session
        resource_name: Name of the resource (e.g., 'app')
        resource_id: UUID of the resource

    Raises:
        HTTPException: If validation fails

    """
    if not agent_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent session with id {session_id} not found for {resource_name} {resource_id}",
        )

    if agent_session.agent_session.status != AgentSessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent session with id {session_id} for {resource_name} {resource_id} is not in ACTIVE status",
        )

    if (
        agent_session.agent_session.is_running_on
        and agent_session.agent_session.is_running_on
        > datetime.now(UTC) - timedelta(seconds=30)
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Agent is already running a turn. Please wait for it to finish.",
        )

    agent_session.agent_session.is_running_on = func.now()


async def send_agent_chat_message(
    request: Request,
    session_id: UUID,
    message_request: MessageRequest,
    agent_session: AgentSessionBase,
    agent_tasks: set[asyncio.Task],
) -> StreamingResponse:
    """Unified function to process a user message in any agent session type.

    Args:
        request: FastAPI request object
        session_id: UUID of the session
        message_request: The message request data
        agent_session: The agent session (app agent session)
        agent_tasks: Set of background tasks

    Returns:
        StreamingResponse: The streaming response for the chat message

    """
    new_input_item: TResponseInputItem = {
        "content": message_request.message,
        "role": "user",
    }

    # Get last_message_id and current_agent from agent_session
    last_message_id = agent_session.agent_session.last_message_id
    current_agent_name = agent_session.agent_session.current_agent

    # Create a message queue for this request
    message_queue: asyncio.Queue[
        tuple[str, TResponseStreamEvent | Exception] | None
    ] = asyncio.Queue()

    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    trace_metadata = agent_session.get_trace_metadata()
    # Prepare RunConfig
    run_config = RunConfig(
        model_provider=OpenAIProvider(openai_client=openai_client),
        trace_metadata=trace_metadata,
    )

    # Create appropriate context
    context = AppAgentRunContext(
        session_id=session_id,
        version=agent_session.agent_session.version,
        sandbox_url=f"http://localhost:{agent_session.agent_session.port}",
    )

    # Initialize the sandbox server
    await initialize_context_and_sandbox_server(
        agent_session=agent_session,
        run_context=context,
    )

    input_items: list[TResponseInputItem] = [new_input_item]
    current_agent: Agent = NAME_TO_AGENT_FACTORY[current_agent_name](
        message_queue,
        previous_response_id=last_message_id,
        run_config=run_config,
        context=context,
    )

    # Launch agent turn in the background
    task = asyncio.create_task(
        run_agent_turn(
            openai_client=openai_client,
            session_id=session_id,
            input_items=input_items,
            context=context,
            last_message_id=last_message_id,
            current_agent=current_agent,
            message_queue=message_queue,
            run_config=run_config,
        )
    )
    agent_tasks.add(task)
    task.add_done_callback(agent_tasks.discard)

    # Return streaming response
    return StreamingResponse(
        stream_from_message_queue(message_queue, current_agent),
        media_type="text/event-stream",
    )


async def run_agent_turn(
    openai_client: AsyncOpenAI,
    session_id: UUID,
    input_items: list[TResponseInputItem],
    context: AgentRunContext,
    last_message_id: str | None,
    current_agent: Agent,
    message_queue: asyncio.Queue[tuple[str, TResponseStreamEvent] | None],
    run_config: RunConfig,
):
    """Run an agent turn, streaming events to a queue for the FastAPI response generator.

    Args:
        openai_client: The OpenAI client
        session_id: The UUID of the agent session
        input_items: The list of input items for the agent
        context: The run context with API tokens and URLs
        last_message_id: The ID of the last message
        current_agent: The current agent
        message_queue: Queue to stream results back to FastAPI endpoint
        run_config: Configuration for the agent run, including model provider

    """
    start_time = time.monotonic()
    try:
        # Run the agent with streaming
        result: RunResultStreaming = Runner.run_streamed(
            current_agent,
            input=input_items,
            previous_response_id=last_message_id,
            context=context,
            run_config=run_config,
            max_turns=100,
        )

        # Create a task to periodically mark the session as running
        async def mark_session_running():
            while True:
                await asyncio.gather(
                    asyncio.sleep(10),
                    asyncio.to_thread(_mark_agent_session_as_running, session_id),
                )

        mark_task = asyncio.create_task(
            mark_session_running(), name="mark_session_running"
        )

        try:
            # Stream events to the queue
            async with openai_client:
                async for event in result.stream_events():
                    if not isinstance(event, RawResponsesStreamEvent):
                        continue
                    await message_queue.put((current_agent.name, event.data))
        finally:
            # Cancel the marking task when we're done streaming
            mark_task.cancel()
            try:
                await mark_task
            except asyncio.CancelledError:
                pass

        logger.info(f"Agent turn completed for session {session_id}")

        # Context cleanup (if needed)
        await context.on_turn_end()

        # Turn completed, write conversation to DB
        await asyncio.to_thread(
            _complete_agent_turn,
            session_id=session_id,
            input_items=input_items,
            result=result,
        )

    except AgentsException as e:
        # Log the error and push it to the queue
        logger.error(f"Agent error: {e}")
        await message_queue.put((current_agent.name, e))
        raise

    finally:
        await asyncio.gather(
            # Always unmark the agent session as running and push the sentinel
            asyncio.to_thread(_unmark_agent_session_as_running, session_id),
            # Push None sentinel to signal end of messages
            message_queue.put(None),
        )
        logger.info(
            f"Agent session {session_id} turn ended in {time.monotonic() - start_time:.2f} seconds"
        )


async def initialize_context_and_sandbox_server(
    agent_session: AgentSessionBase,
    run_context: AgentRunContext,
) -> None:
    """Initialize the sandbox server with all initialization data.

    Args:
        agent_session: The agent session
        run_context: The run context with API tokens and URLs

    Raises:
        HTTPException: If initialization fails

    """
    initialization_data = await asyncio.to_thread(
        agent_session.get_initialization_data,
    )

    # Initialize sandbox server
    async with run_context.get_sandbox_client() as client:
        response = await client.post("/initialize", json=initialization_data)
        response.raise_for_status()
        logger.info(
            f"Successfully initialized agent session {agent_session.id}, status: {response.status_code}"
        )


def _mark_agent_session_as_running(session_id: UUID):
    """Mark an agent session as running in the database."""
    with session_local() as db:
        updated = (
            db.query(AgentSession)
            .filter(AgentSession.id == session_id)
            .update({AgentSession.is_running_on: func.now()})
        )
        db.commit()
        if updated:
            logger.info(f"Marked agent session {session_id} as running")


def _unmark_agent_session_as_running(session_id: UUID):
    """Unmark an agent session as running in the database."""
    with session_local() as db:
        agent_session = (
            db.query(AgentSession).filter(AgentSession.id == session_id).first()
        )
        if agent_session:
            agent_session.is_running_on = None
            db.commit()
            logger.info(f"Unmarked agent session {session_id} as running")


def _complete_agent_turn(
    session_id: UUID,
    input_items: list[TResponseInputItem],
    result: RunResultStreaming,
):
    """Complete an agent turn, writing the conversation to the database and bumping the version number.

    Args:
        session_id: The UUID of the agent session
        input_items: The list of input items for the agent
        result: The streaming result from Runner.run_streamed()

    """
    with session_local() as db:
        # Bump the version of the agent session
        agent_session = (
            db.query(AgentSession).filter(AgentSession.id == session_id).one()
        )
        agent_session.version += 1
        agent_session.is_running_on = None
        agent_session.last_message_id = result.last_response_id
        agent_session.current_agent = result.current_agent.name

        # Save the user inputs first
        for item in input_items:
            db.add(
                ConversationItem(
                    agent_session_id=session_id,
                    message=item,
                )
            )

        # Save every new RunItem
        if getattr(result, "new_items", None):
            # Create a list of ConversationItem objects to add in a batch
            for item in result.new_items:
                db.add(
                    ConversationItem(
                        agent_session_id=session_id,
                        message=item.to_input_item(),
                    )
                )

        db.commit()
        logger.info(
            f"Persisted {len(result.new_items) + len(input_items)} items for session {session_id}"
        )


async def stream_from_message_queue(
    message_queue: asyncio.Queue[tuple[str, TResponseStreamEvent | Exception] | None],
    current_agent: Agent,
):
    """Stream events from the message queue to the client."""
    last_heartbeat = time.monotonic()

    while True:
        # Check if we need to send a heartbeat
        current_time = time.monotonic()
        if current_time - last_heartbeat >= 10:
            yield (
                json.dumps({"event_type": "heartbeat", "timestamp": current_time})
                + "\n\n"
            )
            last_heartbeat = current_time

        # Wait for the next message from the queue with a timeout
        try:
            item = await asyncio.wait_for(message_queue.get(), timeout=10)
        except asyncio.TimeoutError:
            continue

        try:
            # If we got the None sentinel, we're done
            if item is None:
                return

            (agent_name, agent_item) = item

            # Check if it's an error message
            if isinstance(agent_item, Exception):
                yield (
                    json.dumps(
                        {
                            "event_type": "error",
                            "error": str(agent_item),
                            "agent": agent_name,
                        }
                    )
                    + "\n\n"
                )
            elif isinstance(agent_item, ResponseReasoningSummaryTextDeltaEvent):
                yield (
                    json.dumps(
                        {
                            "event_type": agent_item.type,
                            "delta": agent_item.delta,
                            "agent": agent_name,
                        }
                    )
                    + "\n\n"
                )
            elif (
                isinstance(agent_item, ResponseTextDeltaEvent)
                and agent_name == current_agent.name
            ):
                yield (
                    json.dumps(
                        {
                            "event_type": agent_item.type,
                            "delta": agent_item.delta,
                            "agent": agent_name,
                        }
                    )
                    + "\n\n"
                )
            elif isinstance(agent_item, ResponseOutputItemAddedEvent):
                if agent_item.item.type == "function_call":
                    # Function call started
                    yield (
                        json.dumps(
                            {
                                "event_type": agent_item.type,
                                "item_type": agent_item.item.type,
                                "function_name": agent_item.item.name,
                                "agent": agent_name,
                            }
                        )
                        + "\n\n"
                    )
                else:
                    yield (
                        json.dumps(
                            {
                                "event_type": agent_item.type,
                                "item_type": agent_item.item.type,
                                "agent": agent_name,
                            }
                        )
                        + "\n\n"
                    )
            elif isinstance(agent_item, ResponseFunctionCallArgumentsDoneEvent):
                # Function arguments done
                event_data = {
                    "event_type": agent_item.type,
                    "agent": agent_name,
                }

                yield (json.dumps(event_data) + "\n\n")
            elif isinstance(agent_item, ResponseFunctionCallArgumentsDeltaEvent):
                yield (
                    json.dumps(
                        {
                            "event_type": agent_item.type,
                            "agent": agent_name,
                            "delta": agent_item.delta,
                        }
                    )
                    + "\n\n"
                )
            else:
                continue
        finally:
            # Always mark the task as done
            message_queue.task_done()


def get_conversation_messages_for_session(session_id: UUID) -> list[MessageResponse]:
    """Get formatted conversation messages for a session."""
    with session_local() as db:
        # Fetch conversation items ordered by id
        conversation_items = (
            db.query(ConversationItem)
            .filter(
                ConversationItem.agent_session_id == session_id,
            )
            .order_by(ConversationItem.id)
            .all()
        )

        # Format the conversation items
        formatted_messages = []

        ignore_run_item_types = [
            "function_call",
            "function_call_output",
            "computer_call",
            "computer_call_output",
            "file_search_call",
            "web_search_call",
            "tool_call_item",
            "tool_call_output_item",
            "handoff_call_item",
            "handoff_output_item",
            "reasoning_item",
        ]

        for item in conversation_items:
            message_data = item.message

            # Skip ignored item types
            if message_data.get("type") in ignore_run_item_types:
                continue

            # Extract role and item type
            role = message_data.get("role")
            item_type = message_data.get("type")

            # user message doesn't have a type
            if role == "user":
                formatted_messages.append(
                    MessageResponse(
                        id=item.id,
                        role="user",
                        content=message_data.get("content", ""),
                    )
                )
            elif item_type == "message":
                # Handle normal message type with content array
                content_array = message_data.get("content", [])
                combined_text = []
                # Process each content item based on its type
                for content_item in content_array:
                    if not isinstance(content_item, dict):
                        continue

                    content_type = content_item.get("type")

                    # Extract text based on content type
                    if content_type == "output_text":
                        combined_text.append(content_item["text"])
                    elif content_type == "refusal":
                        combined_text.append(content_item["refusal"])

                formatted_messages.append(
                    MessageResponse(
                        id=item.id,
                        role="assistant",
                        content="".join(combined_text),
                    )
                )

        return formatted_messages
