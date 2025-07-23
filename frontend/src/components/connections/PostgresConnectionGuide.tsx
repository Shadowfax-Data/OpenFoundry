import { Badge } from "@/components/ui/badge";

export function PostgresConnectionGuide() {
  return (
    <div className="w-full max-w-md bg-muted rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4">
        PostgreSQL Database Setup Guide
      </h2>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Prerequisites</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>A running PostgreSQL server instance.</li>
          <li>Server hostname/IP and port number.</li>
          <li>A PostgreSQL user with appropriate permissions.</li>
          <li>Database name to connect to.</li>
          <li>Network access from OpenFoundry to your PostgreSQL host.</li>
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
              to identify this PostgreSQL connection.
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
              Your PostgreSQL server hostname or IP address (e.g.
              postgres.example.com).
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
              <span className="font-medium text-primary">Enter Port</span>
              <br />
              The port number for your PostgreSQL server. The default is 5432.
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
              <span className="font-medium text-primary">Enter User</span>
              <br />
              The database user that will be used for connecting to your
              PostgreSQL server. This user should have permissions to create and
              manage tables in the specified schema.
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
              <span className="font-medium text-primary">Enter Password</span>
              <br />
              The password for the database user.
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
                Enter Database Name
              </span>
              <br />
              The name of the database to connect to.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Badge
              variant="outline"
              className="w-7 h-7 flex items-center justify-center rounded-full mr-1 mt-0.5 font-semibold"
            >
              7
            </Badge>
            <span>
              <span className="font-medium text-primary">Enter Schema</span>
              <br />
              The schema to use within the database. The default is `public`.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
