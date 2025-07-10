from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SqlExecutionResult:
    """Result of executing a SQL command."""

    success: bool
    data: list[dict]
    rows_affected: int
    error: str | None = None

    @staticmethod
    def success_result(
        data: list[dict] | None = None,
        rows_affected: int = 0,
    ) -> SqlExecutionResult:
        """Create a successful result."""
        return SqlExecutionResult(
            success=True,
            data=data or [],
            rows_affected=rows_affected,
            error=None,
        )

    @staticmethod
    def error_result(error_message: str) -> SqlExecutionResult:
        """Create an error result."""
        return SqlExecutionResult(
            success=False,
            data=[],
            rows_affected=0,
            error=error_message,
        )
