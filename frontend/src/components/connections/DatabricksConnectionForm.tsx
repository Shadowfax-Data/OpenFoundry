import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  createDatabricksConnection,
  updateDatabricksConnection,
} from "@/store/slices/connectionsSlice";
import {
  DatabricksConnectionCreate,
  DatabricksConnectionUpdate,
} from "@/types/api";
import { useDatabricksConnection } from "@/hooks/useConnection";

const databricksConnectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z
    .string()
    .min(1, "Host is required")
    .refine(
      (host) => !host.startsWith("https://") && !host.startsWith("http://"),
      "Host should not include http:// or https://",
    ),
  http_path: z.string().min(1, "HTTP Path is required"),
  token: z.string().min(1, "Personal Access Token is required"),
  catalog: z.string().optional(),
  schema: z.string().optional(),
});

export function DatabricksConnectionForm({
  connectionId,
}: {
  connectionId?: string;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isEditMode = connectionId !== undefined;
  const { loading, error } = useAppSelector((state) => state.connections);

  // Use the hook to fetch connection data
  const {
    connection: connectionData,
    loading: isLoadingConnection,
    error: connectionError,
  } = useDatabricksConnection(connectionId);

  const form = useForm<z.infer<typeof databricksConnectionSchema>>({
    resolver: zodResolver(databricksConnectionSchema),
    defaultValues: {
      name: "",
      host: "",
      http_path: "",
      token: "",
      catalog: "",
      schema: "",
    },
  });

  // Populate form when connection data is loaded
  useEffect(() => {
    if (isEditMode && connectionData) {
      form.reset({
        name: connectionData.name,
        host: connectionData.host,
        http_path: connectionData.http_path,
        token: "********",
        catalog: connectionData.catalog || "",
        schema: connectionData.schema || "",
      });
    }
  }, [isEditMode, connectionData, form]);

  async function onSubmit(values: z.infer<typeof databricksConnectionSchema>) {
    // If the token is still the placeholder, we don't want to send it
    const submissionValues = { ...values };
    if (isEditMode && submissionValues.token === "********") {
      delete (submissionValues as Partial<typeof submissionValues>).token;
    }

    if (isEditMode) {
      await dispatch(
        updateDatabricksConnection({
          connectionId: connectionId!,
          connectionData: submissionValues as DatabricksConnectionUpdate,
        }),
      ).unwrap();
    } else {
      await dispatch(
        createDatabricksConnection(
          submissionValues as DatabricksConnectionCreate,
        ),
      ).unwrap();
    }
    navigate("/connections");
  }

  const handleCancel = () => {
    navigate("/connections");
  };

  // Show loading state while fetching connection data
  if (isEditMode && isLoadingConnection) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Loading connection details...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if connection fetch failed
  if (isEditMode && connectionError) {
    return (
      <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
        {connectionError}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My Databricks" {...field} />
              </FormControl>
              <FormDescription>
                A name to identify this SQL Warehouse
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host</FormLabel>
              <FormControl>
                <Input placeholder="xxxx.cloud.databricks.com" {...field} />
              </FormControl>
              <FormDescription>
                Databricks workspace URL (e.g., xxxx.cloud.databricks.com)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="http_path"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTTP Path</FormLabel>
              <FormControl>
                <Input placeholder="/sql/1.0/warehouses/xxx" {...field} />
              </FormControl>
              <FormDescription>SQL Warehouse HTTP Path</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal Access Token (PAT)</FormLabel>
              <FormControl>
                <Input type="password" placeholder="dapi..." {...field} />
              </FormControl>
              <FormDescription>
                Databricks Personal Access Token. This will not be displayed
                again for security reasons.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="catalog"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catalog</FormLabel>
              <FormControl>
                <Input placeholder="my_catalog" {...field} />
              </FormControl>
              <FormDescription>Default catalog name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="schema"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Schema</FormLabel>
              <FormControl>
                <Input placeholder="my_schema" {...field} />
              </FormControl>
              <FormDescription>Default schema name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditMode
                ? "Save Connection"
                : "Create Databricks Connection"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
