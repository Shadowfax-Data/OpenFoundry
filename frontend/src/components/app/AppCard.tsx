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
  Trash2,
  Rocket,
} from "lucide-react";
import { App } from "@/types/api";

interface AppCardProps {
  app: App;
  sessionStatus: "active" | "stopped";
  sessionCount: number;
  isEditLoading: boolean;
  isDeployLoading?: boolean;
  onEditClick: (appId: string) => void;
  onStopSession?: (appId: string) => void;
  onViewSessions?: (appId: string) => void;
  onOpenApp?: (appId: string) => void;
  onDeleteApp?: (appId: string) => void;
  onDeployApp?: (appId: string) => void;
}

export function AppCard({
  app,
  sessionStatus,
  sessionCount,
  isEditLoading,
  isDeployLoading = false,
  onEditClick,
  onStopSession,
  onViewSessions,
  onOpenApp,
  onDeleteApp,
  onDeployApp,
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
                  <DropdownMenuItem
                    onClick={() => onOpenApp?.(app.id)}
                    className="cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {app.deployment_port ? "Open Deployed App" : "Open App"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onViewSessions?.(app.id)}
                    className="cursor-pointer"
                  >
                    <List className="h-4 w-4 mr-2" />
                    View Sessions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onStopSession?.(app.id)}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Session
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={() => onViewSessions?.(app.id)}
                  className="cursor-pointer"
                >
                  <List className="h-4 w-4 mr-2" />
                  View Sessions
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeployApp?.(app.id)}
                className="cursor-pointer"
                disabled={isDeployLoading}
              >
                <Rocket className="h-4 w-4 mr-2" />
                {isDeployLoading
                  ? "Deploying..."
                  : app.deployment_port
                    ? "Redeploy App"
                    : "Deploy App"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteApp?.(app.id)}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete App
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2">{app.name}</h3>
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

        {/* Deployment status */}
        {app.deployment_port && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Rocket className="h-4 w-4 text-blue-500" />
            <span>Deployed on port {app.deployment_port}</span>
          </div>
        )}

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
