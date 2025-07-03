import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";
import { MainContent } from "./main-content";

export function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-sidebar">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <Navbar />

          <main className="flex flex-1">
            <MainContent />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
