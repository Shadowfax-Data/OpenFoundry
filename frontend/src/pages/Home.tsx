import { IconChartArcs } from "@tabler/icons-react";
import {
  ArrowUp,
  BarChart3,
  BookOpen,
  FileText,
  Globe,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { BuildOptionsDialog } from "@/components/app/BuildOptionsDialog";
import { CreateAppDialog } from "@/components/app/CreateAppDialog";
import { SampleProjectCard } from "@/components/app/SampleProjectCard";
import { CreateNotebookDialog } from "@/components/notebooks/CreateNotebookDialog";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/store";
import { fetchConnections } from "@/store/slices/connectionsSlice";

export function Home() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [createAppDialogOpen, setCreateAppDialogOpen] = useState(false);
  const [createNotebookDialogOpen, setCreateNotebookDialogOpen] =
    useState(false);
  const [buildOptionsDialogOpen, setBuildOptionsDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(
    undefined,
  );
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    dispatch(fetchConnections());
  }, [dispatch]);

  const handleSampleProjectClick = (prompt: string) => {
    setInitialPrompt(prompt);
    setCreateAppDialogOpen(true);
  };

  const handleBuildApplicationClick = () => {
    setInitialPrompt(undefined);
    setCreateAppDialogOpen(true);
  };

  const handlePromptSubmit = () => {
    if (prompt.trim()) {
      setInitialPrompt(prompt.trim());
      setBuildOptionsDialogOpen(true);
    }
  };

  const handleSelectApplication = () => {
    setBuildOptionsDialogOpen(false);
    setCreateAppDialogOpen(true);
  };

  const handleSelectNotebook = () => {
    setBuildOptionsDialogOpen(false);
    setCreateNotebookDialogOpen(true);
  };

  const buildOptions = [
    {
      id: "application",
      title: "Application",
      description: "Build interactive data apps and dashboards",
      icon: <Globe className="h-6 w-6" />,
      iconBgColor: "bg-blue-600",
      onClick: handleSelectApplication,
    },
    {
      id: "notebook",
      title: "Notebook",
      description: "Create data analysis and computational notebooks",
      icon: <BookOpen className="h-6 w-6" />,
      iconBgColor: "bg-purple-600",
      onClick: handleSelectNotebook,
    },
  ];

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
              <textarea
                placeholder="Ask OpenFoundry to build..."
                className="w-full rounded-lg border border-gray-200 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-gray-300 focus:outline-none focus:ring-0 resize-none overflow-hidden min-h-[48px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && prompt.trim()) {
                    e.preventDefault();
                    handlePromptSubmit();
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = target.scrollHeight + "px";
                }}
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handlePromptSubmit}
                  disabled={!prompt.trim()}
                >
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
              onClick={handleBuildApplicationClick}
            >
              <FileText className="h-4 w-4" />
              Create a data application
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setCreateNotebookDialogOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
              Create a notebook
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
      {buildOptionsDialogOpen && initialPrompt && (
        <BuildOptionsDialog
          prompt={initialPrompt}
          onClose={() => setBuildOptionsDialogOpen(false)}
          options={buildOptions}
        />
      )}
      {createAppDialogOpen && (
        <CreateAppDialog
          onCreatingSession={setIsCreatingSession}
          onClose={() => setCreateAppDialogOpen(false)}
          initialPrompt={initialPrompt}
          disabled={isCreatingSession}
        />
      )}
      {createNotebookDialogOpen && (
        <CreateNotebookDialog
          onCreatingSession={setIsCreatingSession}
          onClose={() => setCreateNotebookDialogOpen(false)}
          initialPrompt={initialPrompt}
          disabled={isCreatingSession}
        />
      )}
    </div>
  );
}
