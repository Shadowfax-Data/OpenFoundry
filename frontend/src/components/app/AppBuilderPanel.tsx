import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Code, MoreVertical } from "lucide-react";
import { AppPreview } from "@/components/app/AppPreview";
import { CodePanel } from "@/components/code/CodePanel";
import { CurrentWriteFileInfo } from "@/store/slices/chatSliceFactory";

interface AppBuilderPanelProps {
  previewUrl?: string;
  appId: string;
  sessionId: string;
  currentWriteFileInfo: CurrentWriteFileInfo | null;
}

export const AppBuilderPanel: React.FC<AppBuilderPanelProps> = ({
  previewUrl,
  appId,
  sessionId,
  currentWriteFileInfo,
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  return (
    <div className="h-full bg-background rounded-r-lg border-0 flex flex-col">
      {/* Top Navigation Tabs */}
      <div className="border-b px-4 py-2 flex items-center h-10">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold">App Builder</h1>
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={activeTab === "preview" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("preview")}
                className="h-6 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
              <Button
                variant={activeTab === "code" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("code")}
                className="h-6 text-xs"
              >
                <Code className="h-3 w-3 mr-1" />
                Code
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1">
        <div className={activeTab === "preview" ? "h-full" : "hidden"}>
          <AppPreview
            previewUrl={previewUrl}
            appId={appId}
            sessionId={sessionId}
          />
        </div>
        <div className={activeTab === "code" ? "h-full" : "hidden"}>
          <CodePanel
            currentWriteFileInfo={currentWriteFileInfo}
            appId={appId}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
};
