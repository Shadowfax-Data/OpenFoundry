import { useCallback, useEffect, useState } from "react";

import {
  BigQueryConnectionModel,
  ClickhouseConnectionModel,
  DatabricksConnectionModel,
  PostgresConnectionModel,
  SnowflakeConnectionModel,
} from "@/types/api";

interface UseConnectionReturn<T> {
  connection: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSnowflakeConnection(
  connectionId?: string,
): UseConnectionReturn<SnowflakeConnectionModel> {
  const [connection, setConnection] = useState<SnowflakeConnectionModel | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/connections/snowflake/${connectionId}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: SnowflakeConnectionModel = await response.json();
      setConnection(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch connection details",
      );
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    loading,
    error,
    refetch: fetchConnection,
  };
}

export function useDatabricksConnection(
  connectionId?: string,
): UseConnectionReturn<DatabricksConnectionModel> {
  const [connection, setConnection] =
    useState<DatabricksConnectionModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/connections/databricks/${connectionId}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DatabricksConnectionModel = await response.json();
      setConnection(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch connection details",
      );
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    loading,
    error,
    refetch: fetchConnection,
  };
}

export function useClickhouseConnection(
  connectionId?: string,
): UseConnectionReturn<ClickhouseConnectionModel> {
  const [connection, setConnection] =
    useState<ClickhouseConnectionModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/connections/clickhouse/${connectionId}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ClickhouseConnectionModel = await response.json();
      setConnection(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch connection details",
      );
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    loading,
    error,
    refetch: fetchConnection,
  };
}

export function usePostgresConnection(
  connectionId?: string,
): UseConnectionReturn<PostgresConnectionModel> {
  const [connection, setConnection] = useState<PostgresConnectionModel | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/connections/postgres/${connectionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: PostgresConnectionModel = await response.json();
      setConnection(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch connection details",
      );
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    loading,
    error,
    refetch: fetchConnection,
  };
}

export function useBigQueryConnection(
  connectionId?: string,
): UseConnectionReturn<BigQueryConnectionModel> {
  const [connection, setConnection] = useState<BigQueryConnectionModel | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/connections/bigquery/${connectionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: BigQueryConnectionModel = await response.json();
      setConnection(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch connection details",
      );
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    loading,
    error,
    refetch: fetchConnection,
  };
}
