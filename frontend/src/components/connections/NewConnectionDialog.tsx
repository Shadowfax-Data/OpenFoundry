import {
  SiClickhouse,
  SiDatabricks,
  SiGooglecloud,
  SiSnowflake,
} from "@icons-pack/react-simple-icons";
import { useNavigate } from "react-router";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NewConnectionDialogProps {
  children: React.ReactNode;
}

export function NewConnectionDialog({ children }: NewConnectionDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add New Connection</DialogTitle>
          <DialogDescription>
            Select a connection type to add.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <div
            className="p-4 border rounded-md cursor-pointer hover:bg-muted"
            onClick={() => navigate("/connections/snowflake/new")}
          >
            <div className="flex items-center gap-3">
              <SiSnowflake className="text-blue-500" />
              <div>
                <span className="font-semibold">Snowflake</span>
                <p className="text-sm text-muted-foreground">
                  Connect to a Snowflake data warehouse.
                </p>
              </div>
            </div>
          </div>
          <div
            className="p-4 border rounded-md cursor-pointer hover:bg-muted"
            onClick={() => navigate("/connections/bigquery/new")}
          >
            <div className="flex items-center gap-3">
              <SiGooglecloud className="text-[#4c8bf5]" />
              <div>
                <span className="font-semibold">BigQuery</span>
                <p className="text-sm text-muted-foreground">
                  Connect to a BigQuery data warehouse.
                </p>
              </div>
            </div>
          </div>
          <div
            className="p-4 border rounded-md cursor-pointer hover:bg-muted"
            onClick={() => navigate("/connections/databricks/new")}
          >
            <div className="flex items-center gap-3">
              <SiDatabricks className="text-orange-500" />
              <div>
                <span className="font-semibold">Databricks</span>
                <p className="text-sm text-muted-foreground">
                  Connect to a Databricks SQL warehouse.
                </p>
              </div>
            </div>
          </div>
          <div
            className="p-4 border rounded-md cursor-pointer hover:bg-muted"
            onClick={() => navigate("/connections/clickhouse/new")}
          >
            <div className="flex items-center gap-3">
              <SiClickhouse className="text-yellow-400" />
              <div>
                <span className="font-semibold">ClickHouse</span>
                <p className="text-sm text-muted-foreground">
                  Connect to a ClickHouse data warehouse.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
