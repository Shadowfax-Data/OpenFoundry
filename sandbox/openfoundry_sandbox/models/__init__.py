# This file makes models a Python package

# Import main classes for easier access
from .connections.connection import Connection
from .connections.snowflake_connection import SnowflakeConnection

__all__ = ["Connection", "SnowflakeConnection"]
