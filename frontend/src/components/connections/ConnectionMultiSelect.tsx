import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Connection } from "@/types/api";

interface ConnectionMultiSelectProps {
  connections: Connection[];
  selectedConnectionIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  className?: string;
  placeholder?: string;
}

export function ConnectionMultiSelect({
  connections,
  selectedConnectionIds,
  onSelectionChange,
  className,
  placeholder = "Select connections...",
}: ConnectionMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [triggerWidth, setTriggerWidth] = React.useState<number>(0);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const selectedConnections = connections.filter((connection) =>
    selectedConnectionIds.includes(connection.id),
  );

  const handleSelect = (connectionId: string) => {
    if (selectedConnectionIds.includes(connectionId)) {
      onSelectionChange(
        selectedConnectionIds.filter((id) => id !== connectionId),
      );
    } else {
      onSelectionChange([...selectedConnectionIds, connectionId]);
    }
  };

  const handleRemove = (connectionId: string) => {
    onSelectionChange(
      selectedConnectionIds.filter((id) => id !== connectionId),
    );
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[40px] h-auto"
          >
            <div className="flex flex-wrap items-center gap-1 flex-1">
              {selectedConnections.length > 0 ? (
                selectedConnections.map((connection) => (
                  <Badge
                    key={connection.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {connection.name}
                    <span
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRemove(connection.id);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(connection.id);
                      }}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">
                  {placeholder}
                </span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          style={{ width: triggerWidth }}
        >
          <Command>
            <CommandInput placeholder="Search connections..." />
            <CommandList>
              <CommandEmpty>No connections found.</CommandEmpty>
              <CommandGroup>
                {connections.map((connection) => (
                  <CommandItem
                    key={connection.id}
                    value={connection.id}
                    onSelect={() => handleSelect(connection.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedConnectionIds.includes(connection.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{connection.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {connection.type}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
