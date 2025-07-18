import { SiDatabricks, SiSnowflake } from "@icons-pack/react-simple-icons";
import {
  BookOpen,
  Calendar,
  CircleX,
  MoreVertical,
  Pause,
  Play,
  Save,
  Square,
  Trash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Notebook } from "@/types/api";

interface NotebookCardProps {
  notebook: Notebook;
  sessionStatus: "active" | "stopped";
  sessionCount: number;
  isEditLoading: boolean;
  isSaveLoading?: boolean;
  onEditClick: (notebookId: string) => void;
  onStopSession?: (notebookId: string) => void;
  onDeleteSession?: (notebookId: string) => void;
  onSaveNotebook?: (notebookId: string) => void;
  onDeleteNotebook?: (notebookId: string) => void;
}

export function NotebookCard({
  notebook,
  sessionStatus,
  sessionCount,
  isEditLoading,
  isSaveLoading = false,
  onEditClick,
  onStopSession,
  onDeleteSession,
  onSaveNotebook,
  onDeleteNotebook,
}: NotebookCardProps) {
  const getIconForConnectionType = (type: string) => {
    switch (type.toLowerCase()) {
      case "snowflake":
        return <SiSnowflake className="h-4 w-4" />;
      case "databricks":
        return <SiDatabricks className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`h-12 w-12 rounded-lg ${notebook.color} flex items-center justify-center text-white cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => onEditClick(notebook.id)}
          >
            <BookOpen className="h-6 w-6 group-hover:animate-bounce" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sessionStatus === "active" && (
                <>
                  <DropdownMenuItem
                    onClick={() => onSaveNotebook?.(notebook.id)}
                    className="cursor-pointer"
                    disabled={isSaveLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaveLoading ? "Saving..." : "Save Notebook"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onStopSession?.(notebook.id)}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Session
                  </DropdownMenuItem>
                </>
              )}
              {sessionCount > 0 && (
                <>
                  <DropdownMenuItem
                    onClick={() => onDeleteSession?.(notebook.id)}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <CircleX className="h-4 w-4 mr-2" />
                    Delete Session
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => onDeleteNotebook?.(notebook.id)}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Notebook
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2">{notebook.name}</h3>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {notebook.lastModified}
          </div>
          <div className="flex items-center gap-1">
            {sessionStatus === "active" ? (
              <Play className="h-4 w-4 text-green-500" />
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-xs">
              {sessionCount} session{sessionCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Connections */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 min-h-[20px]">
          {notebook.connections && notebook.connections.length > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-xs">Connections:</span>
              {notebook.connections.map((connection) => {
                const icon = getIconForConnectionType(connection.type);
                return icon ? (
                  <Tooltip key={connection.id}>
                    <TooltipTrigger asChild>
                      <div className="p-1 rounded bg-muted hover:bg-muted/80 transition-colors">
                        {icon}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{connection.name}</TooltipContent>
                  </Tooltip>
                ) : null;
              })}
            </div>
          ) : (
            <span className="text-xs">No connections</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                sessionStatus === "active" ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="text-sm capitalize">{sessionStatus}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClick(notebook.id)}
            disabled={isEditLoading}
          >
            {isEditLoading ? "Loading..." : "Open Notebook"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotebookCard;
