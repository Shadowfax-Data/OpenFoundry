import { IconChartArcs } from "@tabler/icons-react";
import { AppWindow, ChevronDown, Database, Home } from "lucide-react";
import { Link, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-none">
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-between" size="sm">
              <div className="flex items-center">
                <IconChartArcs className="mr-2 h-4 w-4" />
                Create a new &hellip;
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/apps/new" className="flex items-center cursor-pointer">
                <AppWindow className="mr-2 h-4 w-4" />
                Application
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="flex-1">
          <div className="px-3 py-2 text-muted-foreground">
            {/* Navigation Items */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link
                        to="/"
                        className={`w-full ${location.pathname === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Home
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link
                        to="/apps"
                        className={`w-full ${location.pathname.startsWith("/apps") ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
                      >
                        <AppWindow className="mr-2 h-4 w-4" />
                        Apps
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link
                        to="/connections"
                        className={`w-full ${location.pathname.startsWith("/connections") ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Connections
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
