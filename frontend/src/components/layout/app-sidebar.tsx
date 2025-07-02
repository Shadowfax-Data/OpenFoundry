import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Folder,
  Clock,
  Users,
  Plus,
} from "lucide-react";

const recentItems = [
  "Excel data workspace",
  "Sidebar for workflows",
  "Kubernetes job history",
  "Mocking data pipeline UI",
  "Data entry UI design",
  "Shadowfax landing page",
  "Collapsible reasoning su...",
  "React-flow database dia...",
  "Conversational AI Interfa...",
  "Create new pipeline page",
  "Reveal password icon",
  "User defined env form",
  "ETL pipeline wizard",
  "Landing page design",
  "React router setup",
  "React Router setup",
  "Tailwind React router",
  "React router data mode",
  "Custom form modification",
  "Streamlit app mockup",
  "Streamlit styling",
  "Activation form design",
  "Hero section redesign",
  "Shadowfax landing page",
  "Sql onboarding wizard",
];

const favoriteProjects = ["Project Alpha", "Dashboard UI", "Landing Pages"];

const favoriteChats = [
  "AI Assistant Chat",
  "Code Review Discussion",
  "Design Feedback",
];

export function AppSidebar() {
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isChatsOpen, setIsChatsOpen] = useState(false);
  const [isRecentsOpen, setIsRecentsOpen] = useState(true);

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

            {/* Favorite Projects */}
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between p-2"
                  onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                >
                  <span>Favorite Projects</span>
                  {isProjectsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </SidebarGroupLabel>
              {isProjectsOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {favoriteProjects.map((project, index) => (
                      <SidebarMenuItem key={index}>
                        <SidebarMenuButton size="sm" className="text-sm">
                          {project}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>

            {/* Favorite Chats */}
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between p-2"
                  onClick={() => setIsChatsOpen(!isChatsOpen)}
                >
                  <span>Favorite Chats</span>
                  {isChatsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </SidebarGroupLabel>
              {isChatsOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {favoriteChats.map((chat, index) => (
                      <SidebarMenuItem key={index}>
                        <SidebarMenuButton size="sm" className="text-sm">
                          {chat}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>

            {/* Recents */}
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between p-2"
                  onClick={() => setIsRecentsOpen(!isRecentsOpen)}
                >
                  <span>Recents</span>
                  {isRecentsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </SidebarGroupLabel>
              {isRecentsOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {recentItems.map((item, index) => (
                      <SidebarMenuItem key={index}>
                        <SidebarMenuButton size="sm" className="text-sm">
                          <span className="truncate">{item}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
