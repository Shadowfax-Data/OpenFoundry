import Editor from "@monaco-editor/react";
import { Copy, Download, File } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReadFileResponse } from "@/types/files";

interface FileEditorProps {
  selectedFile: ReadFileResponse | null;
  initialPath: string;
}

export function FileEditor({ selectedFile, initialPath }: FileEditorProps) {
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
      a.download = selectedFile.file_info.name;
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
      case "yml":
      case "yaml":
        return "yaml";
      case "xml":
        return "xml";
      case "sql":
        return "sql";
      case "sh":
      case "bash":
        return "bash";
      default:
        return "text";
    }
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

  const language = getFileLanguage(selectedFile.file_info.name);

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="h-8 border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <File className="h-4 w-4" />
          <span className="text-xs font-medium flex items-center gap-1">
            {selectedFile.file_info.path
              .replace(
                new RegExp(
                  `^/?${initialPath.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}/?`,
                ),
                "",
              )
              .split("/")
              .map((segment, idx, arr) => (
                <span key={idx} className="flex items-center gap-1">
                  {idx < arr.length - 1 ? (
                    <>
                      <span className="text-muted-foreground">{segment}</span>
                      <span className="mx-0.5 text-muted-foreground">/</span>
                    </>
                  ) : (
                    <span className="font-semibold text-foreground">
                      {segment}
                    </span>
                  )}
                </span>
              ))}
          </span>
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

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language === "text" ? "plaintext" : language}
          value={selectedFile.content}
          theme="vs"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: "on",
            wordWrap: "on",
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            renderLineHighlight: "all",
            selectOnLineNumbers: true,
            automaticLayout: true,
          }}
        />
      </div>

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
