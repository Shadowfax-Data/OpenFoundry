import { useState, useEffect } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { FileBrowser } from "./FileBrowser";
import { FileEditor } from "./FileEditor";
import { CurrentWriteFileInfo } from "@/store/slices/appChatSlice";

interface CodePanelProps {
  currentWriteFileInfo: CurrentWriteFileInfo | null;
}

export function CodePanel({ currentWriteFileInfo }: CodePanelProps) {
  const [selectedFile, setSelectedFile] = useState<CurrentWriteFileInfo | null>(
    currentWriteFileInfo,
  );

  // Update selected file when currentWriteFileInfo changes
  useEffect(() => {
    if (currentWriteFileInfo) {
      setSelectedFile(currentWriteFileInfo);
    }
  }, [currentWriteFileInfo]);

  return (
    <div className="h-full bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <FileBrowser
            currentWriteFileInfo={currentWriteFileInfo}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
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
