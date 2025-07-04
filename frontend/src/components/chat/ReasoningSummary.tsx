import React, { useState, useEffect } from "react";

import { MarkdownMessage } from "./MarkdownMessage";

interface ReasoningSummaryProps {
  summary: string;
  isStreaming: boolean;
}

export const ReasoningSummary: React.FC<ReasoningSummaryProps> = ({
  summary,
  isStreaming,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    if (summary && isStreaming) {
      setOpen(true);
    } else if (!isStreaming) {
      setOpen(false);
    }
  }, [isStreaming, summary]);

  if (!summary || summary.trim() === "") return null;

  return (
    <div className="mt-2">
      <button
        className="text-xs text-gray-500 underline focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? "Hide reasoning" : "Show reasoning"}
      </button>
      {open && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-1 whitespace-pre-wrap">
          <MarkdownMessage
            content={summary}
            className="text-xs text-gray-500"
          />
        </div>
      )}
    </div>
  );
};
