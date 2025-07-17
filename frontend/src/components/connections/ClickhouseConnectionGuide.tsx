import { Badge } from "@/components/ui/badge";

export default function ClickhouseConnectionGuide() {
  return (
    <div className="w-full max-w-md bg-muted rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4">
        ClickHouse Database Setup Guide
      </h2>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Prerequisites</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>A running ClickHouse server instance.</li>
          <li>Server hostname/IP and port number.</li>
          <li>Valid ClickHouse username and password.</li>
          <li>Database name and appropriate permissions.</li>
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
              to identify this ClickHouse connection.
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
              Your ClickHouse server hostname or IP address (e.g., localhost,
              clickhouse.example.com). Don&apos;t include the protocol prefix.
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
              The port number for your ClickHouse server. Common ports are 9000
              for the native protocol or 8443 for HTTPS interface.
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
              <span className="font-medium text-primary">Enter Username</span>
              <br />
              Your ClickHouse username. The default username is typically
              &quot;default&quot; unless you&apos;ve configured custom users.
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
              Your ClickHouse password. If using the default user with no
              password configured, this field may be left empty.
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
              <span className="font-medium text-primary">Specify Database</span>
              <br />
              The default database name to connect to. Common choices are
              &quot;default&quot; or your application-specific database name.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
