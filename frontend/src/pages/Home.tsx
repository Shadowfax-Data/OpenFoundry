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
import { useState } from "react";
import { useNavigate } from "react-router";

import { CreateAppDialog } from "@/components/app/CreateAppDialog";
import { SampleProjectCard } from "@/components/app/SampleProjectCard";
import { Button } from "@/components/ui/button";

export function Home() {
  const navigate = useNavigate();
  const [createAppDialogOpen, setCreateAppDialogOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(
    undefined,
  );
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const handleSampleProjectClick = (prompt: string) => {
    setInitialPrompt(prompt);
    setCreateAppDialogOpen(true);
  };

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
              onClick={() => navigate("/connections")}
            >
              <BarChart3 className="h-4 w-4" />
              Set up data connection
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SampleProjectCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Sales Dashboard"
                description="Track revenue and performance metrics"
                onClick={() =>
                  handleSampleProjectClick(
                    "Build a sales dashboard to track revenue and performance metrics.",
                  )
                }
                iconBgColor="bg-blue-600"
              />
              <SampleProjectCard
                icon={<Users className="h-5 w-5" />}
                title="User Analytics"
                description="Monitor user behavior and engagement"
                onClick={() =>
                  handleSampleProjectClick(
                    "Create a user analytics dashboard to monitor user behavior and engagement.",
                  )
                }
                iconBgColor="bg-green-600"
              />
              <SampleProjectCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="Growth Metrics"
                description="Analyze customer acquisition and retention"
                onClick={() =>
                  handleSampleProjectClick(
                    "Develop a growth metrics dashboard to analyze customer acquisition and retention.",
                  )
                }
                iconBgColor="bg-purple-600"
              />
              <SampleProjectCard
                icon={<FileText className="h-5 w-5" />}
                title="Reports"
                description="Generate comprehensive data dashboards"
                onClick={() =>
                  handleSampleProjectClick(
                    "Generate comprehensive data dashboards for our key business areas.",
                  )
                }
                iconBgColor="bg-orange-600"
              />
            </div>
          </div>
        </div>
      </div>
      {createAppDialogOpen && (
        <CreateAppDialog
          onCreatingSession={setIsCreatingSession}
          onClose={() => setCreateAppDialogOpen(false)}
          initialPrompt={initialPrompt}
          disabled={isCreatingSession}
        />
      )}
      {/* {isCreatingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            Creating session...
          </div>
        </div>
      )} */}
    </div>
  );
}
