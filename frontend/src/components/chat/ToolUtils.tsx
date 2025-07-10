import {
  Bug,
  Clock,
  Code,
  Database,
  Eye,
  FileText,
  Pencil,
  Play,
  Search,
  Wrench,
} from "lucide-react";

import { CurrentWriteFileInfo } from "@/store/slices/chatSliceFactory";

export const getToolIcon = (functionName: string) => {
  const baseClasses = "w-4 h-4 text-gray-600";

  switch (functionName) {
    case "write_file":
      return <Code className={baseClasses} />;
    case "read_file":
      return <FileText className={baseClasses} />;
    case "list_files":
      return <Search className={baseClasses} />;
    case "implement_code_for_task":
      return <Code className={baseClasses} />;
    case "get_source_sample":
      return <FileText className={baseClasses} />;
    case "describe_destination":
      return <Search className={baseClasses} />;
    case "dry_run":
      return <Play className={baseClasses} />;
    case "wait_for_dry_run":
      return <Clock className={baseClasses} />;
    case "tail_dry_run_logs":
      return <FileText className={baseClasses} />;
    case "read_dry_run_logs":
      return <FileText className={baseClasses} />;
    case "debug_transform":
      return <Bug className={baseClasses} />;
    case "find_file_contents":
      return <Search className={baseClasses} />;
    case "find_file_names":
      return <Search className={baseClasses} />;
    case "execute_sql":
      return <Database className={baseClasses} />;
    case "str_replace_editor":
      return <Pencil className={baseClasses} />;
    case "visualize_app":
      return <Eye className={baseClasses} />;
    case "list_connections":
      return <Search className={baseClasses} />;
    default:
      return <Wrench className={baseClasses} />;
  }
};

export const getToolLabel = (
  functionName: string,
  fileInfo?: CurrentWriteFileInfo | null,
) => {
  switch (functionName) {
    case "write_file":
      return fileInfo ? `Writing ${fileInfo.fileName}` : "Writing File";
    case "read_file":
      return "Reading File";
    case "list_files":
      return "Listing Files";
    case "implement_code_for_task":
      return "Implementing Code";
    case "get_source_sample":
      return "Getting Source Sample";
    case "describe_destination":
      return "Analyzing Destination";
    case "dry_run":
      return "Dry Running Code";
    case "wait_for_dry_run":
      return "Waiting for Dry Run";
    case "tail_dry_run_logs":
      return "Tailing Dry Run Logs";
    case "read_dry_run_logs":
      return "Reading Dry Run Logs";
    case "debug_transform":
      return "Debugging Transform";
    case "run_shell_command":
      return "Running Process";
    case "wait_for_process":
      return "Waiting for Process";
    case "tail_process_logs":
      return "Tailing Process Logs";
    case "read_process_logs":
      return "Reading Process Logs";
    case "find_file_contents":
      return "Finding File Contents";
    case "find_file_names":
      return "Finding File Names";
    case "execute_sql":
      return "Executing SQL";
    case "str_replace_editor":
      return "Using File Editor";
    case "visualize_app":
      return "Visualizing App";
    case "list_connections":
      return "Listing Connections";
    default:
      return "Using Tool";
  }
};
