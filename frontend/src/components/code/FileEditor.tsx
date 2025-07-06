import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Download, File } from "lucide-react";
import { CurrentWriteFileInfo } from "@/store/slices/appChatSlice";

interface FileEditorProps {
  selectedFile: CurrentWriteFileInfo | null;
}

export function FileEditor({ selectedFile }: FileEditorProps) {
  const copyToClipboard = async () => {
    if (selectedFile?.content) {
      try {
        await navigator.clipboard.writeText(selectedFile.content);
        // You can add a toast notification here
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    }
  };

  const downloadFile = () => {
    if (selectedFile) {
      const blob = new Blob([selectedFile.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFile.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getFileLanguage = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "py":
        return "python";
      case "html":
        return "html";
      case "css":
        return "css";
      case "json":
        return "json";
      case "md":
        return "markdown";
      default:
        return "text";
    }
  };

  const renderLineNumbers = (content: string) => {
    const lines = content.split("\n");
    return lines.map((_, index) => (
      <div
        key={index}
        className="text-right text-xs text-muted-foreground pr-2 select-none"
        style={{ minWidth: "3rem" }}
      >
        {index + 1}
      </div>
    ));
  };

  const renderCodeLines = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, index) => (
      <div key={index} className="text-xs font-mono whitespace-pre">
        {line || "\u00A0"} {/* Non-breaking space for empty lines */}
      </div>
    ));
  };

  if (!selectedFile) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center text-center">
        <File className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No file selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a file from the browser to view its contents
        </p>
      </div>
    );
  }

  const language = getFileLanguage(selectedFile.fileName);

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="h-10 border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <File className="h-4 w-4" />
          <span className="text-sm font-medium">{selectedFile.fileName}</span>
          <Badge variant="secondary" className="text-xs">
            {language}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={downloadFile}
            title="Download file"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="flex">
          {/* Line numbers */}
          <div className="bg-muted/30 border-r py-2 sticky left-0 z-10">
            {renderLineNumbers(selectedFile.content)}
          </div>

          {/* Code content */}
          <div className="flex-1 p-2">
            {renderCodeLines(selectedFile.content)}
          </div>
        </div>
      </ScrollArea>

      {/* Footer info */}
      <div className="h-6 border-t px-3 py-1 text-xs text-muted-foreground bg-muted/30 flex items-center">
        <span>
          {selectedFile.content.split("\n").length} lines •{" "}
          {selectedFile.content.length} characters
        </span>
      </div>
    </div>
  );
}
