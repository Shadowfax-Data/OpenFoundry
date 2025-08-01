import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";

import { ConnectionMultiSelect } from "@/components/connections/ConnectionMultiSelect";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store";
import { createNotebookAgentSession } from "@/store/slices/notebookAgentSessionsSlice";
import { createNotebook } from "@/store/slices/notebooksSlice";

const createNotebookSchema = z.object({
  name: z.string().min(1, "Notebook name is required"),
  connectionIds: z.array(z.string()),
  prompt: z.string().optional(),
});

type CreateNotebookFormData = z.infer<typeof createNotebookSchema>;

interface CreateNotebookDialogProps {
  onCreatingSession: (isCreating: boolean) => void;
  onClose: () => void;
  disabled?: boolean;
  initialPrompt?: string;
}

export function CreateNotebookDialog({
  onCreatingSession,
  onClose,
  disabled = false,
  initialPrompt,
}: CreateNotebookDialogProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading } = useAppSelector((state) => state.notebooks);
  const { connections } = useAppSelector((state) => state.connections);

  const form = useForm<CreateNotebookFormData>({
    resolver: zodResolver(createNotebookSchema),
    defaultValues: {
      name: "",
      connectionIds: [],
      prompt: initialPrompt || "",
    },
  });

  const handleCreateNotebook = async (data: CreateNotebookFormData) => {
    try {
      // Create the notebook first
      const notebookResult = await dispatch(
        createNotebook({
          name: data.name.trim(),
          connection_ids: data.connectionIds,
        }),
      ).unwrap();

      // Reset form
      form.reset();
      onClose();

      // Show session creation loading state
      onCreatingSession(true);

      // Create an agent session for the new notebook
      const sessionResult = await dispatch(
        createNotebookAgentSession(notebookResult.id),
      ).unwrap();

      // Navigate to the notebook chat page, passing prompt as a query param if non-empty
      const promptParam = data.prompt?.trim()
        ? `?prompt=${encodeURIComponent(data.prompt.trim())}`
        : "";
      navigate(
        `/notebooks/${notebookResult.id}/sessions/${sessionResult.session.id}/chat${promptParam}`,
      );
    } catch (error) {
      console.error("Failed to create notebook or session:", error);
    } finally {
      onCreatingSession(false);
    }
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
            <FormField
              control={form.control}
              name="connectionIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connections</FormLabel>
                  <FormControl>
                    <ConnectionMultiSelect
                      connections={connections}
                      selectedConnectionIds={field.value}
                      onSelectionChange={field.onChange}
                      placeholder="Select connections..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    What would you like to analyze?{" "}
                    <Badge variant="secondary">optional</Badge>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your data analysis goals..."
                      className="min-h-[80px]"
                      {...field}
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
                disabled={!form.watch("name")?.trim() || loading || disabled}
              >
                {loading ? "Creating..." : "Create Notebook"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
