import { IconBrandDatabricks } from "@tabler/icons-react";
import { DatabricksConnectionForm } from "@/components/connections/DatabricksConnectionForm";
import DatabricksConnectionGuide from "@/components/connections/DatabricksConnectionGuide";

export function DatabricksConnectionPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto">
        <div className="p-8 mx-auto max-w-6xl">
          <div className="flex gap-12">
            {/* Left: Form */}
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <div className="flex items-center gap-4">
                  <IconBrandDatabricks className="h-12 w-12 text-orange-500 flex-shrink-0" />
                  <div className="flex flex-col justify-center">
                    <h1 className="text-3xl font-bold leading-tight">
                      New Databricks Connection
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Fill in the details to create a new Databricks SQL
                      connection.
                    </p>
                  </div>
                </div>
              </div>
              <DatabricksConnectionForm />
            </div>
            {/* Right: Guide */}
            <DatabricksConnectionGuide />
          </div>
        </div>
      </div>
    </div>
  );
}
