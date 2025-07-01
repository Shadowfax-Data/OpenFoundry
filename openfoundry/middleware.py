from urllib.parse import urlparse

from sqlalchemy.orm import sessionmaker
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp


class SQLAlchemySessionMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        session_local: sessionmaker,
        whitelisted_prefixes: list[str],
        **kwargs,
    ) -> None:
        super().__init__(app, **kwargs)
        self.session_local = session_local
        self.whitelisted_prefixes = tuple(whitelisted_prefixes)

    async def dispatch(self, request, call_next):
        whitelisted = request.scope["path"].startswith(self.whitelisted_prefixes)
        if not whitelisted:
            return await call_next(request)

        # database connections are lazily created when the db session is used in a query
        with self.session_local() as db_session:
            request.state.db = db_session
            return await call_next(request)


class LocalhostCORSMiddleware(CORSMiddleware):
    """Custom CORS middleware that allows any request from localhost/127.0.0.1.

    Uses standard CORS rules for other origins.
    """

    def __init__(self, app: ASGIApp, **kwargs) -> None:
        super().__init__(app, **kwargs)

    def is_allowed_origin(self, origin: str) -> bool:
        if origin:
            parsed = urlparse(origin)
            hostname = parsed.hostname or ""

            # Allow any localhost/127.0.0.1 origin regardless of port
            if hostname in ["localhost", "127.0.0.1"]:
                return True

        # For missing origin or other origins, use the parent class's logic
        return bool(super().is_allowed_origin(origin))
