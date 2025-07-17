import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
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
import { usePostgresConnection } from "@/hooks/useConnection";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  createPostgresConnection,
  updatePostgresConnection,
} from "@/store/slices/connectionsSlice";
import {
  PostgresConnectionCreate,
  PostgresConnectionUpdate,
} from "@/types/api";

const postgresFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  host: z.string().min(1, { message: "Host is required" }),
  port: z
    .number({ invalid_type_error: "Port must be a number" })
    .int("Port must be an integer")
    .min(1, "Port must be greater than 0")
    .max(65535, "Port must be less than 65536"),
  user: z.string().min(1, { message: "User is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  database: z.string().min(1, { message: "Database name is required" }),
  schema: z.string().min(1, { message: "Schema is required" }),
});

type PostgresFormValues = z.infer<typeof postgresFormSchema>;

export function PostgresConnectionForm({
  connectionId,
}: {
  connectionId?: string;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isEditMode = connectionId !== undefined;
  const { loading, error } = useAppSelector((state) => state.connections);

  const {
    connection: connectionData,
    loading: isLoadingConnection,
    error: connectionError,
  } = usePostgresConnection(connectionId);

  const form = useForm<PostgresFormValues>({
    resolver: zodResolver(postgresFormSchema),
    defaultValues: {
      name: "",
      host: "",
      port: 5432,
      user: "",
      password: "",
      database: "",
      schema: "public",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (isEditMode && connectionData) {
      form.reset({
        name: connectionData.name,
        host: connectionData.host,
        port: connectionData.port,
        user: connectionData.user,
        password: "********",
        database: connectionData.database,
        schema: connectionData.schema,
      });
    }
  }, [isEditMode, connectionData, form]);

  async function onSubmit(values: PostgresFormValues) {
    const submissionValues = { ...values };
    if (isEditMode && submissionValues.password === "********") {
      delete (submissionValues as Partial<typeof submissionValues>).password;
    }

    if (isEditMode) {
      await dispatch(
        updatePostgresConnection({
          connectionId: connectionId!,
          connectionData: submissionValues as PostgresConnectionUpdate,
        }),
      ).unwrap();
    } else {
      await dispatch(
        createPostgresConnection(submissionValues as PostgresConnectionCreate),
      ).unwrap();
    }
    navigate("/connections");
  }

  const handleCancel = () => {
    navigate("/connections");
  };

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
              <FormLabel>Connection Name</FormLabel>
              <FormControl>
                <Input placeholder="My Postgres Connection" {...field} />
              </FormControl>
              <FormDescription>
                A user-friendly name for your connection.
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
                <Input placeholder="postgres.example.com" {...field} />
              </FormControl>
              <FormDescription>
                PostgreSQL server hostname or IP address.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="port"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Port</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="5432"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                PostgreSQL server port (Default is 5432).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="user"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User</FormLabel>
              <FormControl>
                <Input placeholder="postgres_user" {...field} />
              </FormControl>
              <FormDescription>PostgreSQL username.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormDescription>PostgreSQL password.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="database"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database Name</FormLabel>
              <FormControl>
                <Input placeholder="mydatabase" {...field} />
              </FormControl>
              <FormDescription>The database to connect to.</FormDescription>
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
                <Input placeholder="public" {...field} />
              </FormControl>
              <FormDescription>
                The schema to use (Default is public).
              </FormDescription>
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
          <Button type="submit" disabled={!form.formState.isValid || loading}>
            {loading
              ? "Saving..."
              : isEditMode
                ? "Save Connection"
                : "Create Connection"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
