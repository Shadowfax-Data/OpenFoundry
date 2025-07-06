import { useState } from "react";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CurrentWriteFileInfo } from "@/store/slices/appChatSlice";

interface FileBrowserProps {
  currentWriteFileInfo: CurrentWriteFileInfo | null;
  selectedFile: CurrentWriteFileInfo | null;
  onFileSelect: (file: CurrentWriteFileInfo | null) => void;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
  expanded?: boolean;
}

export function FileBrowser({
  currentWriteFileInfo,
  selectedFile,
  onFileSelect,
}: FileBrowserProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  // Generate file tree structure from current write file info
  const generateFileTree = (): FileNode[] => {
    if (!currentWriteFileInfo) {
      return [];
    }

    const { absolute_file_path } = currentWriteFileInfo;
    const pathParts = absolute_file_path.split("/").filter(Boolean);
    const tree: FileNode[] = [];
    let currentLevel = tree;

    // Build the tree structure
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isFile = i === pathParts.length - 1;
      const fullPath = "/" + pathParts.slice(0, i + 1).join("/");

      let existingNode = currentLevel.find((node) => node.name === part);
      if (!existingNode) {
        existingNode = {
          name: part,
          type: isFile ? "file" : "folder",
          path: fullPath,
          children: isFile ? undefined : [],
        };
        currentLevel.push(existingNode);
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children;
      }
    }

    return tree;
  };

  const fileTree = generateFileTree();

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile?.absolute_file_path === node.path;

    return (
      <div key={node.path}>
        <Button
          variant="ghost"
          className={`w-full justify-start h-6 px-2 text-xs ${
            isSelected ? "bg-accent" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node.path);
            } else if (currentWriteFileInfo) {
              onFileSelect(currentWriteFileInfo);
            }
          }}
        >
          {node.type === "folder" ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 mr-1 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1 flex-shrink-0" />
              )}
              <Folder className="h-3 w-3 mr-1 flex-shrink-0" />
            </>
          ) : (
            <>
              <File className="h-3 w-3 mr-1 ml-4 flex-shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </Button>
        {node.type === "folder" && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-background border-r">
      <div className="h-10 border-b px-3 py-2 flex items-center">
        <h3 className="text-sm font-medium">Files</h3>
      </div>
      <ScrollArea className="h-[calc(100%-2.5rem)]">
        <div className="p-2">
          {fileTree.length > 0 ? (
            fileTree.map((node) => renderFileNode(node))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <File className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No files to display</p>
              <p className="text-xs">
                Files will appear here when the AI generates code
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
