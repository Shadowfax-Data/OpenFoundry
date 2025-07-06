import { useState, useEffect } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { FileBrowser } from "./FileBrowser";
import { FileEditor } from "./FileEditor";
import { CurrentWriteFileInfo } from "@/store/slices/appChatSlice";
import { useAgentSessionFiles } from "@/hooks/useAgentSessionFiles";
import { ReadFileResponse } from "@/types/files";

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
  const {
    files,
    loading,
    error,
    loadedFolders,
    loadingFolders,
    readFile,
    refreshFiles,
    loadFolderContents,
  } = useAgentSessionFiles({
    appId,
    sessionId,
    initialPath: "/workspace",
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

  return (
    <div className="h-full bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
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
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={70}>
          <FileEditor selectedFile={selectedFile} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
