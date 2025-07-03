import { Outlet } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";

export function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-sidebar">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <Navbar />

          <main className="flex flex-1">
            <div className="flex-1 overflow-auto mx-1">
              <div className="h-full rounded-lg border bg-background p-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
