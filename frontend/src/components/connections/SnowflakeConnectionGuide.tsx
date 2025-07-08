import { Badge } from "@/components/ui/badge";

export default function SnowflakeConnectionGuide() {
  return (
    <div className="w-full max-w-md bg-muted rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4">
        Snowflake Warehouse Setup Guide
      </h2>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Prerequisites</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>A Snowflake account with appropriate permissions.</li>
          <li>A Snowflake user with key-pair authentication configured.</li>
          <li>A private key file for authentication.</li>
          <li>Database, warehouse, and schema names.</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Setup instructions</h3>
        <ol className="list-none text-sm text-muted-foreground space-y-2 pl-0">
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
              <span className="font-medium text-primary">Enter Account</span>
              <br />
              Your Snowflake account identifier (e.g., org-account). You can
              find this in your Snowflake URL.
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
              <span className="font-medium text-primary">Enter User</span>
              <br />
              Your Snowflake username that has been configured for key-pair
              authentication.
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
              <span className="font-medium text-primary">Enter Role</span>
              <br />
              The Snowflake role to use for connections (e.g., ACCOUNTADMIN,
              SYSADMIN).
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
                Configure Database, Warehouse, and Schema
              </span>
              <br />
              Specify the database, compute warehouse, and schema.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Badge
              variant="outline"
              className="w-7 h-7 flex items-center justify-center rounded-full mr-1 mt-0.5 font-semibold"
            >
              6
            </Badge>
            <span>
              <span className="font-medium text-primary">
                Upload Private Key
              </span>
              <br />
              Upload your private key file (.pem, .key, or .p8) for key-pair
              authentication. This should correspond to the public key
              registered with your Snowflake user.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
