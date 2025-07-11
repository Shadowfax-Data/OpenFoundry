import { useState, useEffect, useCallback } from "react";
import {
  SnowflakeConnectionModel,
  DatabricksConnectionModel,
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
