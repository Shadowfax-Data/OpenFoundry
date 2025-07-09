import { useState, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  RefreshCw,
  Upload,
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
  onRefreshFolder?: (folderPath: string) => Promise<void>;
  onFileUpload: (file: File, targetPath: string) => Promise<void>;
  currentPath: string;
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
  onRefreshFolder,
  onFileUpload,
  currentPath,
}: FileBrowserProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [isRootDragActive, setIsRootDragActive] = useState(false);

  useEffect(() => {
    const handleDragEnd = () => {
      // Always reset drag states when the drag operation ends globally
      setIsRootDragActive(false);
      setDragOverFolder(null);
    };

    // These listeners on the window object ensure that we catch drag-ends
    // even if they happen outside of the component's direct boundaries.
    window.addEventListener("dragend", handleDragEnd, false);
    window.addEventListener("drop", handleDragEnd, false);

    return () => {
      window.removeEventListener("dragend", handleDragEnd, false);
      window.removeEventListener("drop", handleDragEnd, false);
    };
  }, []);

  // Convert DirectoryEntry to FileNode for tree structure
  const fileTree = useMemo(() => {
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
  }, [files, loadedFolders]);

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

  const handleFileDrop = async (acceptedFiles: File[], targetPath?: string) => {
    const uploadPath = targetPath || currentPath;

    // Clear any lingering drag states
    setDragOverFolder(null);
    setIsRootDragActive(false);

    for (const file of acceptedFiles) {
      const fullPath = `${uploadPath}/${file.name}`.replace(/\/+/g, "/");
      setUploading((prev) => new Set(prev).add(fullPath));

      try {
        await onFileUpload(file, fullPath);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      } finally {
        setUploading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fullPath);
          return newSet;
        });
      }
    }

    // Refresh files after upload
    onRefresh();
  };

  // Root level dropzone
  const { getRootProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setIsRootDragActive(false);
      setDragOverFolder(null);
      handleFileDrop(acceptedFiles);
    },
    onDragEnter: () => setIsRootDragActive(true),
    onDragLeave: (event) => {
      // Only clear root drag state if not over a folder
      if (
        !event.relatedTarget ||
        !event.currentTarget.contains(event.relatedTarget as Node)
      ) {
        setIsRootDragActive(false);
        setDragOverFolder(null);
      }
    },
    noClick: true,
    noKeyboard: true,
  });

  const handleFolderDragEnter = (folderPath: string) => {
    setDragOverFolder(folderPath);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null);
    }
  };

  const handleFolderDrop = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    setIsRootDragActive(false); // Clear root drag state

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileDrop(files, folderPath);
    }
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to prevent root dropzone from activating
  };

  const handleFolderRefresh = async (
    e: React.MouseEvent,
    folderPath: string,
  ) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent folder toggle when clicking refresh

    // Ensure folder is expanded to see the refreshed contents
    setExpandedFolders((prev) => new Set(prev).add(folderPath));

    // Use the dedicated refresh function if provided, otherwise fall back to regular load
    if (onRefreshFolder) {
      await onRefreshFolder(folderPath);
    } else {
      await onLoadFolderContents(folderPath);
    }
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile?.path === node.path;
    const isLoadingFolder = loadingFolders.has(node.path);
    const isDragOver = dragOverFolder === node.path;
    const isUploading = uploading.has(node.path);

    const buttonContent = (
      <div
        className={`flex items-center w-full group ${
          isSelected ? "bg-accent" : ""
        } ${isDragOver ? "bg-blue-100 border-2 border-blue-300 border-dashed" : ""} hover:bg-accent/50 rounded-sm`}
      >
        <Button
          variant="ghost"
          className="flex-1 justify-start h-6 text-xs flex items-center gap-1 hover:bg-transparent"
          style={{ padding: "0 0.25rem" }}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
          disabled={isLoadingFolder || isUploading}
        >
          <span
            className="inline-block flex-shrink-0"
            style={{ width: `${depth * 10}px` }}
          />
          {node.type === "folder" ? (
            <>
              {isLoadingFolder || isUploading ? (
                <RefreshCw className="h-3 w-3 flex-shrink-0 animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
              )}
              {isDragOver ? (
                <Upload className="h-3 w-3 flex-shrink-0 text-blue-500" />
              ) : (
                <Folder className="h-3 w-3 flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3 flex-shrink-0 invisible" />
              <File className="h-3 w-3 flex-shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </Button>
        {node.type === "folder" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-200 flex-shrink-0 mr-1"
            onClick={(e) => handleFolderRefresh(e, node.path)}
            disabled={isLoadingFolder || isUploading}
            title={`Refresh ${node.name}`}
          >
            <RefreshCw className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
    );

    return (
      <div key={node.path}>
        {node.type === "folder" ? (
          <div
            onDragEnter={(e) => {
              e.stopPropagation();
              handleFolderDragEnter(node.path);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              handleFolderDragLeave(e);
            }}
            onDragOver={handleFolderDragOver}
            onDrop={(e) => handleFolderDrop(e, node.path)}
          >
            {buttonContent}
          </div>
        ) : (
          buttonContent
        )}
        {node.type === "folder" && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`h-full flex flex-col ${isRootDragActive ? "bg-blue-50 border-2 border-blue-300 border-dashed" : ""}`}
      {...getRootProps()}
    >
      <ScrollArea className="h-full">
        <div className="py-2">
          {isRootDragActive && (
            <div className="text-center text-blue-600 py-4">
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Drop files here to upload</p>
            </div>
          )}
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
              {isRootDragActive && (
                <p className="text-xs text-blue-600 mt-2">
                  Drop files to get started
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
