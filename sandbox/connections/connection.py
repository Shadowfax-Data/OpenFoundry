from __future__ import annotations

from abc import ABC, abstractmethod
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any

from .utils import SqlExecutionResult

if TYPE_CHECKING:
    from _typeshed.dbapi import DBAPIConnection


class Connection(ABC):
    """Base class for all database connections."""

    def __init__(
        self,
        secrets: dict[str, str],
        **kwargs: Any,
    ) -> None:
        """
        Initialize the connection with basic configuration.

        Args:
            secrets: Dictionary of secret parameters. Child classes should extract needed fields.
            **kwargs: Additional configuration specific to the connection type.
        """
        self._conn: DBAPIConnection | None = None

    @property
    def conn(self) -> DBAPIConnection:
        """Get or create a database connection"""
        if self._conn is None:
            self._init_connection()
        return self._conn

    @contextmanager
    def _get_cursor(self):
        """Context manager for getting a cursor"""
        cursor = self.conn.cursor()
        try:
            yield cursor
        finally:
            cursor.close()

    @abstractmethod
    def _init_connection(self) -> None:
        """Initialize the database connection"""
        raise NotImplementedError(
            "_init_connection must be implemented by the connection"
        )

    def execute_sql(self, sql_statement: str) -> SqlExecutionResult:
        """
        Execute a SQL command.

        Args:
            sql_statement: The SQL statement to execute.

        Returns:
            The result of the SQL execution.
        """
        try:
            with self._get_cursor() as cursor:
                cursor.execute(sql_statement)

                # Check if this is a SELECT query by looking at the description
                if cursor.description:
                    # This is a SELECT query, fetch the results
                    rows = cursor.fetchall()
                    column_names = [desc[0] for desc in cursor.description]

                    # Convert rows to list of dictionaries
                    data = [dict(zip(column_names, row)) for row in rows]
                    return SqlExecutionResult.success_result(
                        data=data,
                        rows_affected=len(data),
                    )
                else:
                    # This is a DML/DDL statement
                    self.conn.commit()
                    return SqlExecutionResult.success_result(
                        rows_affected=cursor.rowcount
                    )
        except Exception as e:
            return SqlExecutionResult.error_result(error_message=str(e))

    def close(self) -> None:
        """Close the database connection"""
        if self._conn:
            self._conn.close()
            self._conn = None
