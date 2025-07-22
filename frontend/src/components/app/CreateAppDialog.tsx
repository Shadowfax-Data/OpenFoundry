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
import { createAppAgentSession } from "@/store/slices/appAgentSessionsSlice";
import { createApp } from "@/store/slices/appsSlice";

const createAppSchema = z.object({
  name: z.string().min(1, "App name is required"),
  connectionIds: z.array(z.string()),
  prompt: z.string().optional(),
});

type CreateAppFormData = z.infer<typeof createAppSchema>;

interface CreateAppDialogProps {
  onCreatingSession: (isCreating: boolean) => void;
  onClose: () => void;
  disabled?: boolean;
  initialPrompt?: string;
}

export function CreateAppDialog({
  onCreatingSession,
  onClose,
  disabled = false,
  initialPrompt,
}: CreateAppDialogProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading } = useAppSelector((state) => state.apps);
  const { connections } = useAppSelector((state) => state.connections);

  const form = useForm<CreateAppFormData>({
    resolver: zodResolver(createAppSchema),
    defaultValues: {
      name: "",
      connectionIds: [],
      prompt: initialPrompt || "",
    },
  });

  const handleCreateApp = async (data: CreateAppFormData) => {
    try {
      // Create the app first
      const appResult = await dispatch(
        createApp({
          name: data.name.trim(),
          connection_ids: data.connectionIds,
        }),
      ).unwrap();

      // Reset form
      form.reset();
      onClose();

      // Show session creation loading state
      onCreatingSession(true);

      // Create an agent session for the new app
      const sessionResult = await dispatch(
        createAppAgentSession(appResult.id),
      ).unwrap();

      // Navigate to the chat page, passing prompt as a query param if non-empty
      const promptParam = data.prompt?.trim()
        ? `?prompt=${encodeURIComponent(data.prompt.trim())}`
        : "";
      navigate(
        `/apps/${appResult.id}/sessions/${sessionResult.session.id}/chat${promptParam}`,
      );
    } catch (error) {
      // Error is handled by Redux state
      console.error("Failed to create app or session:", error);
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
          <DialogTitle>Create New App</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreateApp)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter app name" {...field} autoFocus />
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
                    What would you like to build?{" "}
                    <Badge variant="secondary">optional</Badge>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you want to build..."
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
                {loading ? "Creating..." : "Create App"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
