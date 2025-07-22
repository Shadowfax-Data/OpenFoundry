import { BuildOption, BuildOptionCard } from "@/components/app/BuildOptionCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BuildOptionsDialogProps {
  prompt: string;
  onClose: () => void;
  options: BuildOption[];
}

export function BuildOptionsDialog({
  prompt,
  onClose,
  options,
}: BuildOptionsDialogProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            What should I build?
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-6 rounded-md border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Your request:</p>
            <p className="font-mono text-sm">"{prompt}"</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map(
              ({
                id,
                title,
                description,
                icon,
                iconBgColor,
                onClick,
                disabled,
              }) => (
                <BuildOptionCard
                  key={id}
                  title={title}
                  description={description}
                  icon={icon}
                  iconBgColor={iconBgColor}
                  onClick={onClick}
                  disabled={disabled}
                />
              ),
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
