import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Paperclip,
  Mic,
  ArrowUp,
  Camera,
  Palette,
  FolderUp,
  Target,
  FileText,
  GitFork,
} from "lucide-react";

export function MainContent() {
  return (
    <div className="flex-1 overflow-auto mx-1">
      <div className="h-full rounded-lg border bg-background p-8">
        <div className="mx-auto max-w-4xl">
          {/* Sync banner */}
          <div className="mb-8 flex items-center justify-center">
            <div className="flex items-center space-x-2 rounded-full bg-green-50 px-4 py-2 text-sm">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                New
              </Badge>
              <span>Sync your generation with GitHub</span>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-green-700"
              >
                Try it now →
              </Button>
            </div>
          </div>

          {/* Main heading */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight">
              What can I help you build?
            </h1>
          </div>

          {/* Upgrade banner */}
          <div className="mb-8 flex items-center justify-between rounded-lg border bg-blue-50 p-4">
            <span className="text-sm text-blue-900">
              Upgrade to Premium to unlock all of v0's features and higher
              limits.
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Upgrade Plan
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                ×
              </Button>
            </div>
          </div>

          {/* Input area */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask v0 to build..."
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
              <Camera className="h-4 w-4" />
              Clone a Screenshot
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Palette className="h-4 w-4" />
              Import from Figma
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FolderUp className="h-4 w-4" />
              Upload a Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Landing Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Sign Up Form
            </Button>
          </div>

          {/* Starter Templates */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Starter Templates</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Get started instantly with a framework or integration of your
              choice.
            </p>

            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white">
                  N
                </div>
                <h3 className="font-medium">Next.js</h3>
                <p className="text-sm text-muted-foreground">
                  Build full-stack React apps
                </p>
              </div>

              <div className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white">
                  S
                </div>
                <h3 className="font-medium">Supabase</h3>
                <p className="text-sm text-muted-foreground">
                  Spin up Postgres with auth
                </p>
              </div>

              <div className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
                  N
                </div>
                <h3 className="font-medium">Neon</h3>
                <p className="text-sm text-muted-foreground">
                  Start with Serverless Postgres
                </p>
              </div>

              <div className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white">
                  $
                </div>
                <h3 className="font-medium">Upstash</h3>
                <p className="text-sm text-muted-foreground">
                  Get started with Serverless Redis
                </p>
              </div>
            </div>
          </div>

          {/* From the Community */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">From the Community</h2>
                <p className="text-sm text-muted-foreground">
                  Explore what the community is building with v0.
                </p>
              </div>
              <Button variant="outline" size="sm">
                Browse All →
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border overflow-hidden">
                <div className="aspect-video bg-gray-900"></div>
                <div className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium">
                      Marketing Website
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GitFork className="h-3 w-3" />
                    261 Forks
                  </div>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="aspect-video bg-purple-900"></div>
                <div className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium">
                      Crypto Dashboard
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GitFork className="h-3 w-3" />
                    17.6K Forks
                  </div>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="aspect-video bg-orange-900"></div>
                <div className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-gray-800"></div>
                    <span className="text-sm font-medium">
                      Cyberpunk dashboard design
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GitFork className="h-3 w-3" />
                    792 Forks
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
