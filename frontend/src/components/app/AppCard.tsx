import { SiDatabricks, SiSnowflake } from "@icons-pack/react-simple-icons";
import {
  AppWindowMac,
  Calendar,
  CircleX,
  ExternalLink,
  MoreVertical,
  Pause,
  Play,
  Rocket,
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
import { App } from "@/types/api";

interface AppCardProps {
  app: App;
  sessionStatus: "active" | "stopped";
  sessionCount: number;
  isEditLoading: boolean;
  isDeployLoading?: boolean;
  onEditClick: (appId: string) => void;
  onStopSession?: (appId: string) => void;
  onDeleteSession?: (appId: string) => void;
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
  onDeleteSession,
  onOpenApp,
  onDeleteApp,
  onDeployApp,
}: AppCardProps) {
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
          {app.deployment_port ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`h-12 w-12 rounded-lg ${app.color} flex items-center justify-center text-white cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => onOpenApp?.(app.id)}
                >
                  <AppWindowMac className="h-6 w-6 group-hover:animate-bounce" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Open app in new tab</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`h-12 w-12 rounded-lg ${app.color} flex items-center justify-center text-white`}
                >
                  <AppWindowMac className="h-6 w-6" />
                </div>
              </TooltipTrigger>
              <TooltipContent>App is not deployed</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {app.deployment_port && (
                <DropdownMenuItem
                  onClick={() => onOpenApp?.(app.id)}
                  className="cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open App
                </DropdownMenuItem>
              )}
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
              {sessionStatus === "active" && (
                <>
                  <DropdownMenuItem
                    onClick={() => onStopSession?.(app.id)}
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
                    onClick={() => onDeleteSession?.(app.id)}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <CircleX className="h-4 w-4 mr-2" />
                    Delete Session
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => onDeleteApp?.(app.id)}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash className="h-4 w-4 mr-2" />
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

        {/* Deployment status and Connections */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 min-h-[20px]">
          {/* Deployment status */}
          <div className="flex items-center gap-2">
            {app.deployment_port ? (
              <>
                <Rocket className="h-4 w-4 text-blue-500" />
                <span>Deployed on port {app.deployment_port}</span>
              </>
            ) : (
              <span className="invisible">Deployed on port 0000</span>
            )}
          </div>
          {/* Connections */}
          {app.connections && app.connections.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              {app.connections.map((connection) => {
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
            onClick={() => onEditClick(app.id)}
            disabled={isEditLoading}
          >
            {isEditLoading ? "Loading..." : "Edit App"}
          </Button>
        </div>
      </div>
    </div>
  );
}
