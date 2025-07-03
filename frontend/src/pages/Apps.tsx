import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Users,
  Activity,
} from "lucide-react";

// Mock data for demonstration
const apps = [
  {
    id: 1,
    name: "Sales Dashboard",
    description: "Real-time sales analytics and KPI tracking",
    lastModified: "2 hours ago",
    users: 12,
    status: "active",
    color: "bg-blue-600",
  },
  {
    id: 2,
    name: "User Analytics",
    description: "User behavior and engagement metrics",
    lastModified: "1 day ago",
    users: 8,
    status: "active",
    color: "bg-green-600",
  },
  {
    id: 3,
    name: "Financial Reports",
    description: "Monthly and quarterly financial reporting",
    lastModified: "3 days ago",
    users: 5,
    status: "draft",
    color: "bg-purple-600",
  },
  {
    id: 4,
    name: "Inventory Management",
    description: "Track and manage product inventory",
    lastModified: "1 week ago",
    users: 15,
    status: "active",
    color: "bg-orange-600",
  },
];

export function Apps() {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Apps</h1>
            <p className="text-muted-foreground">
              Manage and create your data applications
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New App
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search apps..."
              className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <Button variant="outline" size="sm">
            All Status
          </Button>
          <Button variant="outline" size="sm">
            Sort by: Recent
          </Button>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <div
            key={app.id}
            className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`h-12 w-12 rounded-lg ${app.color} flex items-center justify-center text-white`}>
                  <Activity className="h-6 w-6" />
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
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
                  <Users className="h-4 w-4" />
                  {app.users} users
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    app.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-sm capitalize">{app.status}</span>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state for when there are no apps */}
      {apps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rounded-lg bg-muted p-8 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No apps yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first data application
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create App
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
