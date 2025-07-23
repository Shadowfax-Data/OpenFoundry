import { useCallback, useState } from "react";

export interface KernelStatus {
  is_ready: boolean;
  is_starting: boolean;
  kernel_id: string | null;
  sandbox_healthy: boolean;
  overall_ready: boolean;
}

interface UseKernelStatusProps {
  baseUrl: string;
}

export const useKernelStatus = ({ baseUrl }: UseKernelStatusProps) => {
  const [kernelStatus, setKernelStatus] = useState<KernelStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get kernel status
  const getKernelStatus =
    useCallback(async (): Promise<KernelStatus | null> => {
      try {
        setError(null);
        const response = await fetch(`${baseUrl}/status`);

        if (!response.ok) {
          throw new Error(
            `Failed to get kernel status: ${response.statusText}`,
          );
        }

        const status = await response.json();
        setKernelStatus(status);
        return status;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get kernel status";
        setError(errorMessage);
        console.error("Error getting kernel status:", err);
        return null;
      }
    }, [baseUrl]);

  return {
    kernelStatus,
    setKernelStatus,
    getKernelStatus,
    error,
    setError,
  };
};
