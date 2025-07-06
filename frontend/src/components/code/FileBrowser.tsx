import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DirectoryEntry, ReadFileResponse } from "@/types/files";

interface FileBrowserProps {
  files: DirectoryEntry[];
  loading: boolean;
  error: string | null;
  selectedFile: ReadFileResponse | null;
  onFileSelect: (filePath: string) => void;
  onRefresh: () => void;
  loadedFolders: Map<string, DirectoryEntry[]>;
  loadingFolders: Set<string>;
  onLoadFolderContents: (folderPath: string) => Promise<void>;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
  expanded?: boolean;
}

export function FileBrowser({
  files,
  loading,
  error,
  selectedFile,
  onFileSelect,
  onRefresh,
  loadedFolders,
  loadingFolders,
  onLoadFolderContents,
}: FileBrowserProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  // Convert DirectoryEntry to FileNode for tree structure
  const generateFileTree = (): FileNode[] => {
    const convertEntryToNode = (entry: DirectoryEntry): FileNode => {
      const node: FileNode = {
        name: entry.name,
        type: entry.is_directory ? "folder" : "file",
        path: entry.path,
      };

      if (entry.is_directory) {
        const folderContents = loadedFolders.get(entry.path) || [];
        node.children = folderContents.map(convertEntryToNode);
      }

      return node;
    };

    return files.map(convertEntryToNode);
  };

  const fileTree = generateFileTree();

  const toggleFolder = async (path: string) => {
    const isCurrentlyExpanded = expandedFolders.has(path);
    const newExpanded = new Set(expandedFolders);

    if (isCurrentlyExpanded) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      // Load folder contents when expanding
      await onLoadFolderContents(path);
    }

    setExpandedFolders(newExpanded);
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile?.path === node.path;
    const isLoadingFolder = loadingFolders.has(node.path);

    return (
      <div key={node.path}>
        <Button
          variant="ghost"
          className={`w-full justify-start h-6 px-2 text-xs ${
            isSelected ? "bg-accent" : ""
          }`}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
          disabled={isLoadingFolder}
        >
          <span
            className="inline-block flex-shrink-0"
            style={{ width: `${depth * 16}px` }}
          />
          {node.type === "folder" ? (
            <>
              {isLoadingFolder ? (
                <RefreshCw className="h-3 w-3 mr-1 flex-shrink-0 animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="h-3 w-3 mr-1 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1 flex-shrink-0" />
              )}
              <Folder className="h-3 w-3 mr-1 flex-shrink-0" />
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3 mr-1 flex-shrink-0 invisible" />
              <File className="h-3 w-3 mr-1 flex-shrink-0" />
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
    <div className="h-full bg-background border-r flex flex-col">
      <div className="h-8 border-b px-3 py-2 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-medium">Files</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh files"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {error ? (
            <div className="text-center text-destructive py-8">
              <File className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Error loading files</p>
              <p className="text-xs">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onRefresh}
              >
                Try again
              </Button>
            </div>
          ) : loading ? (
            <div className="text-center text-muted-foreground py-8">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Loading files...</p>
            </div>
          ) : fileTree.length > 0 ? (
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
