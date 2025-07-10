import { useState, useEffect } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeftToLine, ArrowRightToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileBrowser } from "./FileBrowser";
import { FileEditor } from "./FileEditor";
import { CurrentWriteFileInfo } from "@/store/slices/appChatSlice";
import { useAgentSessionFiles } from "@/hooks/useAgentSessionFiles";
import { ReadFileResponse } from "@/types/files";
import { RefreshCw } from "lucide-react";

interface CodePanelProps {
  currentWriteFileInfo: CurrentWriteFileInfo | null;
  appId: string;
  sessionId: string;
}

export function CodePanel({
  currentWriteFileInfo,
  appId,
  sessionId,
}: CodePanelProps) {
  const [selectedFile, setSelectedFile] = useState<ReadFileResponse | null>(
    null,
  );
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(true);
  const initialPath = "/workspace";
  const {
    files,
    currentPath,
    loading,
    error,
    loadedFolders,
    loadingFolders,
    readFile,
    uploadFile,
    refreshFiles,
    loadFolderContents,
    refreshFolderContents,
  } = useAgentSessionFiles({
    appId,
    sessionId,
    initialPath,
  });

  // Update selected file when currentWriteFileInfo changes
  useEffect(() => {
    if (currentWriteFileInfo) {
      // Convert currentWriteFileInfo to ReadFileResponse format
      const fileResponse: ReadFileResponse = {
        path: currentWriteFileInfo.absolute_file_path,
        content: currentWriteFileInfo.content,
        is_binary: false,
        encoding: "utf-8",
        file_info: {
          path: currentWriteFileInfo.absolute_file_path,
          name: currentWriteFileInfo.fileName,
          size: currentWriteFileInfo.content.length,
          is_directory: false,
          modified_time: Date.now() / 1000,
        },
      };
      setSelectedFile(fileResponse);
    }
  }, [currentWriteFileInfo]);

  const handleFileSelect = async (filePath: string) => {
    const fileData = await readFile(filePath);
    if (fileData) {
      setSelectedFile(fileData);
    }
  };

  const handleRefreshFolder = async (folderPath: string) => {
    // Use the dedicated refresh function that bypasses cache and makes API call
    await refreshFolderContents(folderPath);
  };

  return (
    <div className="h-full bg-background relative">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={isFileBrowserOpen ? 30 : 0}
          minSize={isFileBrowserOpen ? 20 : 0}
          maxSize={isFileBrowserOpen ? 50 : 0}
        >
          <Collapsible
            open={isFileBrowserOpen}
            onOpenChange={setIsFileBrowserOpen}
            className="h-full"
          >
            <CollapsibleContent className="h-full">
              <div className="h-full bg-background border-r flex flex-col">
                <div className="h-8 border-b px-3 py-2 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-sm font-medium">Files</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={refreshFiles}
                      disabled={loading}
                      title="Refresh files"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        title="Collapse file browser"
                      >
                        <ArrowLeftToLine className="h-3 w-3" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <div className="flex-1 h-full">
                  <FileBrowser
                    files={files}
                    loading={loading}
                    error={error}
                    selectedFile={selectedFile}
                    onFileSelect={handleFileSelect}
                    onRefresh={refreshFiles}
                    loadedFolders={loadedFolders}
                    loadingFolders={loadingFolders}
                    onLoadFolderContents={loadFolderContents}
                    onRefreshFolder={handleRefreshFolder}
                    currentPath={currentPath}
                    onFileUpload={async (file: File, targetPath: string) => {
                      await uploadFile(file, targetPath);
                    }}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </ResizablePanel>

        <ResizableHandle
          withHandle={isFileBrowserOpen}
          disabled={!isFileBrowserOpen}
          className={!isFileBrowserOpen ? "pointer-events-none opacity-0" : ""}
        />

        <ResizablePanel defaultSize={isFileBrowserOpen ? 70 : 100}>
          <FileEditor selectedFile={selectedFile} initialPath={initialPath} />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Floating expand button when file browser is collapsed */}
      {!isFileBrowserOpen && (
        <Button
          variant="outline"
          size="sm"
          className="absolute left-0 top-2 z-10 h-8 w-8 p-0 border-l-0 rounded-l-none"
          onClick={() => setIsFileBrowserOpen(true)}
          title="Expand file browser"
        >
          <ArrowRightToLine className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
