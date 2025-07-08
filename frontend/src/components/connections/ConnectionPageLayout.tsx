import React from "react";

interface ConnectionPageLayoutProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  form: React.ReactNode;
  guide: React.ReactNode;
}

export function ConnectionPageLayout({
  icon,
  title,
  subtitle,
  form,
  guide,
}: ConnectionPageLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto">
        <div className="p-8 mx-auto max-w-6xl">
          <div className="flex gap-12">
            {/* Left: Form */}
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <div className="flex items-center gap-4">
                  {icon}
                  <div className="flex flex-col justify-center">
                    <h1 className="text-3xl font-bold leading-tight">
                      {title}
                    </h1>
                    <p className="text-muted-foreground mt-1">{subtitle}</p>
                  </div>
                </div>
              </div>
              {form}
            </div>
            {/* Right: Guide */}
            {guide}
          </div>
        </div>
      </div>
    </div>
  );
}
