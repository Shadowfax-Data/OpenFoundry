from contextlib import asynccontextmanager
from dataclasses import dataclass
from http import HTTPStatus
from uuid import UUID

import httpx
from httpx_retries import Retry, RetryTransport


@dataclass
class AgentRunContext:
    """Base run context for agent sessions with shared functionality."""

    session_id: UUID
    version: int
    sandbox_url: str

    @asynccontextmanager
    async def _get_httpx_client(self, base_url: str):
        """Get an HTTP client with retry capabilities."""
        retry = Retry(
            total=3,
            status_forcelist=[
                HTTPStatus.TOO_MANY_REQUESTS,
                HTTPStatus.BAD_GATEWAY,
                HTTPStatus.SERVICE_UNAVAILABLE,
                HTTPStatus.GATEWAY_TIMEOUT,
            ],
        )
        transport = RetryTransport(
            transport=httpx.AsyncHTTPTransport(),
            retry=retry,
        )

        async with httpx.AsyncClient(
            base_url=base_url,
            transport=transport,
            timeout=60,
        ) as client:
            yield client

    @asynccontextmanager
    async def get_sandbox_client(self):
        """Get an HTTP client for the sandbox server with retry capabilities."""
        async with self._get_httpx_client(self.sandbox_url) as client:
            yield client

    async def check_sandbox_url(self):
        """Check if the sandbox url is reachable."""
        async with self.get_sandbox_client() as client:
            response = await client.get("/health")
            response.raise_for_status()

    async def on_turn_start(self):
        """Called when a turn starts."""
        pass

    async def on_turn_end(self):
        """Called when a turn ends."""
        pass


@dataclass
class AppAgentRunContext(AgentRunContext):
    """Run context for app agent sessions.

    Uses the base AgentRunContext functionality.
    """

    app_url: str

    async def check_app_url(self) -> None:
        """Check if the app url is reachable."""
        async with self._get_httpx_client(self.app_url) as client:
            response = await client.get("/")
            response.raise_for_status()


@dataclass
class NotebookAgentRunContext(AgentRunContext):
    """Run context for notebook agent sessions.

    Uses the base AgentRunContext functionality for notebook operations.
    """

    async def check_notebook_environment(self) -> None:
        """Check if the notebook environment is ready."""
        async with self.get_sandbox_client() as client:
            response = await client.get("/health")
            response.raise_for_status()
