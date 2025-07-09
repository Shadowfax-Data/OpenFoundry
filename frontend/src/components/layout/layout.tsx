import { Outlet } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";
import { Toaster } from "@/components/ui/sonner";

export function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-sidebar">
        <AppSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Navbar />

          <main className="flex flex-1 min-h-0">
            <div className="flex-1 p-2">
              <div className="h-full border bg-background">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
