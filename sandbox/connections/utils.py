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


def format_private_key_for_snowflake(private_key_str: str) -> str:
    """
    Formats a private key string for use with the Snowflake connector.
    If the key is in PEM format (contains -----BEGIN (RSA) PRIVATE KEY-----,
    it removes the header/footer and newlines.
    Otherwise, it assumes the key is already processed and just strips whitespace.
    Args:
        private_key_str: The private key string.
    Returns:
        The processed private key string, ready for the Snowflake connector.
    """
    if (
        "BEGIN PRIVATE KEY" in private_key_str
        or "BEGIN RSA PRIVATE KEY" in private_key_str
    ):
        # Remove header and footer lines for both PKCS8 and RSA formats
        lines = private_key_str.split("\n")
        unnecessary_headers_footers = set(
            [
                "BEGIN PRIVATE KEY",
                "BEGIN RSA PRIVATE KEY",
                "END PRIVATE KEY",
                "END RSA PRIVATE KEY",
            ]
        )
        filtered_lines = [
            line
            for line in lines
            if not any(header in line for header in unnecessary_headers_footers)
        ]
        return "".join(filtered_lines).strip()
    else:
        # Assume it's already processed
        return private_key_str.strip()
