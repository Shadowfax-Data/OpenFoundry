import { IconChartArcs } from "@tabler/icons-react";
import {
  ArrowUp,
  BarChart3,
  FileText,
  Hammer,
  Mic,
  Paperclip,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto">
        <div className="p-8 mx-auto max-w-4xl">
          {/* Main heading */}
          <div className="text-center mb-8 mt-10">
            <div className="mb-8 flex items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                <IconChartArcs className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">OpenFoundry</h1>
                <p className="text-sm text-muted-foreground">
                  The fastest way to build data products with AI
                </p>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              What can I help you build?
            </h1>
          </div>

          {/* Input area */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask OpenFoundry to build..."
                className="w-full rounded-lg border border-gray-200 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-gray-300 focus:outline-none focus:ring-0"
              />
              <div className="absolute right-3 top-3 flex items-center space-x-2">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mb-12 flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Set up data warehouse
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => navigate("/apps")}
            >
              <Hammer className="h-4 w-4" />
              App Builder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Build a data application
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Update a data model
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Analytics
            </Button>
          </div>

          {/* Data Analytics Ideas */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Data Analytics Ideas</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Explore powerful analytics and insights for your data-driven
              decisions.
            </p>

            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="font-medium">Sales Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Track revenue and performance metrics
                </p>
              </div>

              <div className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-medium">User Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor user behavior and engagement
                </p>
              </div>

              <div className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-medium">Growth Metrics</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze customer acquisition and retention
                </p>
              </div>

              <div className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-medium">Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Generate comprehensive data reports
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
