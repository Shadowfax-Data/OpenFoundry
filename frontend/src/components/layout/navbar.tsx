import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Navbar() {
  return (
    <header className="bg-sidebar">
      <div className="flex h-10 items-center px-4">
        <div className="mr-4 flex items-center">
          <SidebarTrigger className="mr-2" />
          <div className="mr-6 flex items-center space-x-2">
            <span className="text-xl font-bold">OpenFoundry</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search would go here */}
          </div>
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              Feedback
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt="User" />
              <AvatarFallback className="bg-emerald-600 text-white">
                U
              </AvatarFallback>
            </Avatar>
          </nav>
        </div>
      </div>
    </header>
  );
}
