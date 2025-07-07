import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Search,
  Folder,
  Clock,
  Users,
  Plus,
  Home,
  AppWindow,
  Database,
} from "lucide-react";

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-none">
      <SidebarHeader className="p-4">
        <Button className="w-full justify-start" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
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
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Folder className="mr-2 h-4 w-4" />
                      Projects
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Clock className="mr-2 h-4 w-4" />
                      Recents
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Users className="mr-2 h-4 w-4" />
                      Community
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
