import { ExternalLink, Eye, Loader2, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";

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
          <iframe
            key={iframeKey}
            title="App Web Preview"
            src={previewUrl}
            className="w-full h-full bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
};
