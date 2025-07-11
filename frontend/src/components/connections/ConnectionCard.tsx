import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Database, Trash2, FilePenLine } from "lucide-react";
import { IconBrandDatabricks, IconBrandSnowflake } from "@tabler/icons-react";
import { Connection } from "@/types/api";

interface ConnectionCardProps {
  connection: Connection;
  onEdit: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
}

export function ConnectionCard({
  connection,
  onEdit,
  onDelete,
}: ConnectionCardProps) {
  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case "snowflake":
        return <IconBrandSnowflake className="h-6 w-6" />;
      case "databricks":
        return <IconBrandDatabricks className="h-6 w-6" />;
      default:
        return <Database className="h-6 w-6" />;
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`h-12 w-12 rounded-lg ${connection.color} flex items-center justify-center text-white`}
          >
            {getIconForType(connection.connection_type)}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEdit(connection.id)}
                className="cursor-pointer"
              >
                <FilePenLine className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(connection.id)}
                variant="destructive"
                className="cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-1">{connection.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {connection.connection_type}
          </p>
        </div>

        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(connection.id)}
          >
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
