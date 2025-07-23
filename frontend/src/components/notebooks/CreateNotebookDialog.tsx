import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const createNotebookSchema = z.object({
  name: z.string().min(1, "Notebook name is required"),
});

type CreateNotebookFormData = z.infer<typeof createNotebookSchema>;

interface CreateNotebookDialogProps {
  onClose: () => void;
  disabled?: boolean;
}

export function CreateNotebookDialog({
  onClose,
  disabled = false,
}: CreateNotebookDialogProps) {
  
  const form = useForm<CreateNotebookFormData>({
    resolver: zodResolver(createNotebookSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleCreateNotebook = async (data: CreateNotebookFormData) => {
    // try {
    //   const notebookResult = await dispatch(
    //     createNotebook({
    //       name: data.name.trim(),
    //     }),
    //   ).unwrap();
    //   form.reset();
    //   onClose();
    //   navigate(`/notebooks/${notebookResult.id}`);
    // } catch (error) {
    //   console.error("Failed to create notebook:", error);
    // }
    console.log("Creating notebook with data:", data);
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Notebook</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreateNotebook)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notebook Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter notebook name"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.watch("name")?.trim() || disabled}
              >
                Create Notebook
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 