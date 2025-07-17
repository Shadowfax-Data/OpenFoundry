import json

from google.cloud import bigquery
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from openfoundry.models.connections.connection import (
    ConnectionBase,
    ConnectionType,
)


class BigQueryConnection(ConnectionBase):
    __tablename__ = "bigquery_connections"

    type = ConnectionType.BIGQUERY

    service_account_key: Mapped[str] = mapped_column(nullable=False)
    project_id: Mapped[str] = mapped_column(nullable=False)

    def get_env_vars(self) -> dict[str, str]:
        """Get Big Query connection environment variables."""
        env_vars = {
            "BIGQUERY_SERVICE_ACCOUNT_KEY": self.service_account_key,
            "BIGQUERY_PROJECT_ID": self.project_id,
        }
        return env_vars

    def check_connection(self) -> None:
        """Check the connection to the Big Query Connection."""
        service_account_info = json.loads(self.service_account_key)

        with bigquery.Client.from_service_account_info(service_account_info) as client:
            query_job = client.query("SELECT 1")
            query_job.result()
