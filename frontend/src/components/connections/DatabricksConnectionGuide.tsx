import { Badge } from "@/components/ui/badge";

export default function DatabricksConnectionGuide() {
  return (
    <div className="w-full max-w-md bg-muted rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4">
        Databricks Warehouse Setup Guide
      </h2>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Prerequisites</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>A Databricks workspace with an available SQL Warehouse.</li>
          <li>Host and HTTP Path for your Databricks SQL Warehouse.</li>
          <li>A Personal Access Token (PAT) with appropriate permissions.</li>
          <li>Database and schema names.</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Setup instructions</h3>
        <ol className="list-none text-sm text-muted-foreground space-y-3 pl-0">
          <li className="flex items-start gap-3">
            <Badge
              variant="outline"
              className="w-7 h-7 flex items-center justify-center rounded-full mr-1 mt-0.5 font-semibold"
            >
              1
            </Badge>
            <span>
              <span className="font-medium text-primary">Enter a Name</span>
              <br />
              to identify this warehouse connection in your models app.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Badge
              variant="outline"
              className="w-7 h-7 flex items-center justify-center rounded-full mr-1 mt-0.5 font-semibold"
            >
              2
            </Badge>
            <span>
              <span className="font-medium text-primary">Enter Host</span>
              <br />
              Your Databricks workspace URL (e.g.,
              &lt;workspace-name&gt;.cloud.databricks.com), don&apos;t include
              the http:// or https:// prefix. You can find this in your SQL
              Warehouse&apos;s Connection Details tab.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Badge
              variant="outline"
              className="w-7 h-7 flex items-center justify-center rounded-full mr-1 mt-0.5 font-semibold"
            >
              3
            </Badge>
            <span>
              <span className="font-medium text-primary">Enter HTTP Path</span>
              <br />
              The HTTP Path for your Databricks SQL Warehouse (e.g.,
              /sql/1.0/warehouses/xxx). Found in the Connection Details tab of
              your SQL Warehouse.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Badge
              variant="outline"
              className="w-7 h-7 flex items-center justify-center rounded-full mr-1 mt-0.5 font-semibold"
            >
              4
            </Badge>
            <span>
              <span className="font-medium text-primary">
                Enter Personal Access Token (PAT)
              </span>
              <br />
              Generate a PAT from your Databricks User Settings page with
              workspace access permissions.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Badge
              variant="outline"
              className="w-7 h-7 flex items-center justify-center rounded-full mr-1 mt-0.5 font-semibold"
            >
              5
            </Badge>
            <span>
              <span className="font-medium text-primary">
                Configure Catalog and Schema
              </span>
              <br />
              Specify the default catalog and schema.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
