import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Calendar,
  AppWindowMac,
  Play,
  Square,
  Pause,
  List,
  ExternalLink,
} from "lucide-react";
import { App } from "@/store/types";

interface AppCardProps {
  app: App;
  sessionStatus: "active" | "stopped";
  sessionCount: number;
  isEditLoading: boolean;
  onEditClick: (appId: string) => void;
  onStopSession?: (appId: string) => void;
  onViewSessions?: (appId: string) => void;
  onOpenApp?: (appId: string) => void;
}

export function AppCard({
  app,
  sessionStatus,
  sessionCount,
  isEditLoading,
  onEditClick,
  onStopSession,
  onViewSessions,
  onOpenApp,
}: AppCardProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`h-12 w-12 rounded-lg ${app.color} flex items-center justify-center text-white`}
          >
            <AppWindowMac className="h-6 w-6" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sessionStatus === "active" ? (
                <>
                  <DropdownMenuItem onClick={() => onOpenApp?.(app.id)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open App
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewSessions?.(app.id)}>
                    <List className="h-4 w-4 mr-2" />
                    View Sessions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onStopSession?.(app.id)}
                    variant="destructive"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Session
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => onViewSessions?.(app.id)}>
                  <List className="h-4 w-4 mr-2" />
                  View Sessions
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2">{app.name}</h3>
          <p className="text-sm text-muted-foreground">{app.description}</p>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {app.lastModified}
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
            onClick={() => onEditClick(app.id)}
            disabled={isEditLoading}
          >
            {isEditLoading ? "Loading..." : "Edit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
