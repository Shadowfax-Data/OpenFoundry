import { Code, Eye, Grid2X2Plus, Rocket, Save } from "lucide-react";
import React, { useState } from "react";

import { AppPreview } from "@/components/app/AppPreview";
import { CodePanel } from "@/components/code/CodePanel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppDispatch } from "@/store";
import { deployApp } from "@/store/slices/appsSlice";
import { CurrentWriteFileInfo } from "@/store/slices/chatSliceFactory";

import { ManageConnectionsDialog } from "./ManageConnectionsDialog";

interface AppBuilderPanelProps {
  previewUrl?: string;
  appId: string;
  sessionId: string;
  currentWriteFileInfo: CurrentWriteFileInfo | null;
  saveWorkspace: () => Promise<void>;
}

export const AppBuilderPanel: React.FC<AppBuilderPanelProps> = ({
  previewUrl,
  appId,
  sessionId,
  currentWriteFileInfo,
  saveWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManageConnectionsDialog, setShowManageConnectionsDialog] =
    useState(false);
  const dispatch = useAppDispatch();

  const handleSaveWorkspace = async () => {
    try {
      setIsProcessing(true);
      await saveWorkspace();
    } catch (error) {
      console.error("Failed to save workspace:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndDeploy = async () => {
    try {
      // Then deploy the app
      setIsProcessing(true);
      // First save the workspace and wait for it to complete
      await saveWorkspace();
      const deployedApp = await dispatch(deployApp(appId)).unwrap();

      // Open the deployed app in a new tab
      if (deployedApp && deployedApp.deployment_port) {
        const url = `${window.location.protocol}//${window.location.hostname}:${deployedApp.deployment_port}`;
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Failed to save and deploy:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Top Navigation Tabs */}
      <div className="border-b px-4 py-2 flex items-center h-10">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold">App Builder</h1>
            <div className="flex bg-muted p-1 rounded-lg">
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
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowManageConnectionsDialog(true)}
                >
                  <Grid2X2Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Manage Connections</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleSaveWorkspace}
                  disabled={isProcessing}
                >
                  <Save className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleSaveAndDeploy}
                  disabled={isProcessing}
                >
                  <Rocket className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save and deploy</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 h-full overflow-hidden">
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

      {/* Manage Connections Dialog */}
      {showManageConnectionsDialog && (
        <ManageConnectionsDialog
          onClose={() => setShowManageConnectionsDialog(false)}
          appId={appId}
          sessionId={sessionId}
        />
      )}
    </div>
  );
};
