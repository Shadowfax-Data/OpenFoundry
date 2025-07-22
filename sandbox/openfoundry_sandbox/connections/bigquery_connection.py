import json
from typing import Any

from google.cloud import bigquery
from google.cloud.bigquery import dbapi

from .connection import Connection


class BigQueryConnection(Connection):
    def __init__(self, secrets: dict[str, str], **kwargs: Any) -> None:
        """
        Initialize the BigQuery connection. with configuration

        Args:
            secrets: A dictionary containing the BigQuery connection secrets.
            **kwargs: Additional keyword arguments.
        """
        super().__init__(secrets=secrets, **kwargs)

        self.service_account_key = secrets.get("BIGQUERY_SERVICE_ACCOUNT_KEY")
        self.project_id = secrets.get("BIGQUERY_PROJECT_ID")
        self.dataset_id = secrets.get("BIGQUERY_DATASET_ID")

    def _init_connection(self) -> None:
        """Initialize the BigQuery connection."""
        service_account_info = json.loads(self.service_account_key)

        # Create a QueryJobConfig with default dataset
        default_query_job_config = bigquery.QueryJobConfig(
            default_dataset=f"{self.project_id}.{self.dataset_id}"
        )

        # Create the client with proper project configuration and default query job config
        client = bigquery.Client.from_service_account_info(
            service_account_info,
            project=self.project_id,
            default_query_job_config=default_query_job_config,
        )

        # Create the DB API connection
        self._conn = dbapi.connect(client=client)

    def cleanup(self) -> None:
        """Clean up the BigQuery connection."""
        self.close()
