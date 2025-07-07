import React, { useState, useEffect } from "react";
import { Eye, RefreshCw, ExternalLink, Loader2 } from "lucide-react";

interface AppPreviewProps {
  previewUrl?: string;
  appId?: string;
  sessionId?: string;
}

export const AppPreview: React.FC<AppPreviewProps> = ({
  previewUrl,
  appId,
  sessionId,
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  // Health check polling
  useEffect(() => {
    if (!previewUrl || !appId || !sessionId) {
      setIsAppReady(false);
      return;
    }

    // Reset app ready state for new URLs
    setIsAppReady(false);

    const checkHealth = async () => {
      const response = await fetch(
        `/api/apps/${appId}/sessions/${sessionId}/app_health`,
      );
      if (response.ok) {
        setIsAppReady(true);
        return true;
      }
      return false;
    };

    const intervalId = setInterval(async () => {
      const isReady = await checkHealth();
      if (isReady) {
        clearInterval(intervalId);
      }
    }, 2000);

    // Initial check
    checkHealth().then((isReady) => {
      if (isReady) {
        clearInterval(intervalId);
      }
    });

    return () => clearInterval(intervalId);
  }, [previewUrl, appId, sessionId]);

  // Reset loading state when URL changes or iframe is manually refreshed
  useEffect(() => {
    if (previewUrl && isAppReady) {
      setIsLoading(true);
      setLoadError(null);
    }
  }, [previewUrl, iframeKey, isAppReady]);

  const handleRefresh = () => {
    if (previewUrl) {
      setIframeKey((k) => k + 1);
    }
  };

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setLoadError("Failed to load preview");
    setIsLoading(false);
  };

  return (
    <div className="h-full w-full flex flex-col rounded-b-lg overflow-hidden">
      {/* Control Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Eye className="h-4 w-4 text-muted-foreground/70 shrink-0" />
          {previewUrl ? (
            <input
              type="text"
              value={previewUrl}
              readOnly
              className="bg-transparent text-xs text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap border-none outline-none flex-1 min-w-0 cursor-default"
              tabIndex={-1}
            />
          ) : (
            <span className="text-xs text-muted-foreground">No URL</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-accent"
            title="Refresh Preview"
            disabled={!previewUrl || !isAppReady}
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-1 rounded hover:bg-accent"
            title="Open in New Tab"
            disabled={!previewUrl || !isAppReady}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      {/* Iframe Preview */}
      <div className="flex-1 overflow-hidden relative">
        {!previewUrl ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
            <Eye className="h-8 w-8 mb-2" />
            <p>Preview will appear here</p>
            <p className="text-sm">
              Start a conversation to see your app preview
            </p>
          </div>
        ) : !isAppReady ? (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-white z-10">
            <Loader2 className="h-8 w-8 mb-2 animate-spin" />
            <p>Waiting for app to become ready...</p>
            <p className="text-xs mt-1">URL: {previewUrl}</p>
          </div>
        ) : (
          <>
            {/* Loader Overlay */}
            {isLoading && (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-white z-10">
                <Loader2 className="h-8 w-8 mb-2 animate-spin" />
                <p>Waiting for app preview...</p>
                <p className="text-xs mt-1">URL: {previewUrl}</p>
              </div>
            )}
            {/* Error State */}
            {loadError && !isLoading && (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-red-500 bg-white z-10">
                <p className="text-sm font-medium">Failed to load preview</p>
                <p className="text-xs mt-1">{loadError}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 rounded"
                >
                  Retry
                </button>
              </div>
            )}
            {/* Single Iframe */}
            <iframe
              key={iframeKey}
              title="App Web Preview"
              src={previewUrl}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full border-0 bg-white"
              style={{ visibility: isLoading ? "hidden" : "visible" }}
              sandbox="allow-scripts allow-same-origin"
            />
          </>
        )}
      </div>
    </div>
  );
};
