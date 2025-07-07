import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconBrandSnowflake } from "@tabler/icons-react";

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
              <IconBrandSnowflake />
              <div>
                <span className="font-semibold">Snowflake</span>
                <p className="text-sm text-muted-foreground">
                  Connect to a Snowflake data warehouse.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
