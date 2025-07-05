import React, { useState, useEffect } from "react";
import { Eye, RefreshCw, ExternalLink, Loader2 } from "lucide-react";

interface AppPreviewProps {
  previewUrl?: string;
}

export const AppPreview: React.FC<AppPreviewProps> = ({ previewUrl }) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Reset loading state when URL changes or iframe is manually refreshed
  useEffect(() => {
    if (previewUrl) {
      setIsLoading(true);
    }
  }, [previewUrl, iframeKey]);

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
            disabled={!previewUrl}
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-1 rounded hover:bg-accent"
            title="Open in New Tab"
            disabled={!previewUrl}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      {/* Iframe Preview */}
      <div className="flex-1 overflow-hidden relative">
        {previewUrl ? (
          <>
            {/* Loader Overlay */}
            {isLoading && (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-white z-10">
                <Loader2 className="h-8 w-8 mb-2 animate-spin" />
                <p>Waiting for app preview...</p>
              </div>
            )}
            {/* Single Iframe */}
            <iframe
              key={iframeKey}
              title="App Web Preview"
              src={previewUrl}
              onLoad={() => setIsLoading(false)}
              className="w-full h-full border-0 bg-white"
              style={{ visibility: isLoading ? "hidden" : "visible" }}
              sandbox="allow-scripts allow-same-origin"
            />
          </>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
            <Eye className="h-8 w-8 mb-2" />
            <p>Preview will appear here</p>
            <p className="text-sm">
              Start a conversation to see your app preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
