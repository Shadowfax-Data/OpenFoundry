import React, { useState } from "react";
import { Eye, RefreshCw, ExternalLink } from "lucide-react";

interface AppPreviewProps {
  previewUrl?: string;
}

export const AppPreview: React.FC<AppPreviewProps> = ({ previewUrl }) => {
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIframeKey((k) => k + 1);
  };

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  return (
    <div className="h-full w-full flex flex-col rounded-lg overflow-hidden">
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
      <div className="flex-1 overflow-hidden">
        {previewUrl ? (
          <iframe
            key={iframeKey}
            title="App Web Preview"
            src={previewUrl}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
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
