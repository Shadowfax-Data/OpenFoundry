import { Badge } from "@/components/ui/badge";

export default function BigQueryConnectionGuide() {
  return (
    <div className="w-full max-w-md bg-muted rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4">
        BigQuery Connection Setup Guide
      </h2>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Prerequisites</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>A Google Cloud Platform account.</li>
          <li>A project with BigQuery API enabled.</li>
          <li>A service account with BigQuery permissions.</li>
          <li>Downloaded service account JSON key file.</li>
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
              to identify this BigQuery connection.
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
              <span className="font-medium text-primary">
                Upload Service Account Key
              </span>
              <br />
              Drag and drop your downloaded service account JSON file from
              Google Cloud Console. This file contains the credentials needed to
              authenticate with BigQuery.
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
              <span className="font-medium text-primary">Enter Project ID</span>
              <br />
              Enter the Google Cloud Project ID that you want to connect to.
              This should match the project where your BigQuery datasets are
              located.
            </span>
          </li>
        </ol>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">
            Creating a Service Account
          </h4>
          <ol className="text-xs text-blue-700 space-y-1">
            <li>
              1. Go to Google Cloud Console → IAM & Admin → Service Accounts
            </li>
            <li>2. Click "Create Service Account"</li>
            <li>3. Add BigQuery Admin or BigQuery User role</li>
            <li>4. Generate and download the JSON key file</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
