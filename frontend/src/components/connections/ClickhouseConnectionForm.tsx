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
import { useClickhouseConnection } from "@/hooks/useConnection";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  createClickhouseConnection,
  updateClickhouseConnection,
} from "@/store/slices/connectionsSlice";
import {
  ClickhouseConnectionCreate,
  ClickhouseConnectionUpdate,
} from "@/types/api";

const clickhouseConnectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z
    .string()
    .min(1, "Host is required")
    .refine(
      (host) => !host.startsWith("https://") && !host.startsWith("http://"),
      "Host should not include http:// or https://",
    ),
  port: z
    .number({ invalid_type_error: "Port must be a number" })
    .int("Port must be an integer")
    .min(1, "Port must be greater than 0")
    .max(65535, "Port must be less than 65536"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  database: z.string().min(1, "Database is required"),
});

export function ClickhouseConnectionForm({
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
  } = useClickhouseConnection(connectionId);

  const form = useForm<z.infer<typeof clickhouseConnectionSchema>>({
    resolver: zodResolver(clickhouseConnectionSchema),
    defaultValues: {
      name: "",
      host: "",
      port: 8443,
      username: "",
      password: "",
      database: "",
    },
  });

  // Populate form when connection data is loaded
  useEffect(() => {
    if (isEditMode && connectionData) {
      form.reset({
        name: connectionData.name,
        host: connectionData.host,
        port: connectionData.port,
        username: connectionData.username,
        password: "********",
        database: connectionData.database,
      });
    }
  }, [isEditMode, connectionData, form]);

  async function onSubmit(values: z.infer<typeof clickhouseConnectionSchema>) {
    // If the password is still the placeholder, we don't want to send it
    const submissionValues = { ...values };
    if (isEditMode && submissionValues.password === "********") {
      delete (submissionValues as Partial<typeof submissionValues>).password;
    }

    if (isEditMode) {
      await dispatch(
        updateClickhouseConnection({
          connectionId: connectionId!,
          connectionData: submissionValues as ClickhouseConnectionUpdate,
        }),
      ).unwrap();
    } else {
      await dispatch(
        createClickhouseConnection(
          submissionValues as ClickhouseConnectionCreate,
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
                <Input placeholder="My ClickHouse Warehouse" {...field} />
              </FormControl>
              <FormDescription>
                A name to identify this ClickHouse connection
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
                <Input placeholder="localhost" {...field} />
              </FormControl>
              <FormDescription>
                ClickHouse server hostname or IP address
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
                  placeholder="8443"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                ClickHouse server port (Default is 8443)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="default" {...field} />
              </FormControl>
              <FormDescription>ClickHouse username</FormDescription>
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
                <Input type="password" placeholder="password" {...field} />
              </FormControl>
              <FormDescription>ClickHouse password.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="database"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database</FormLabel>
              <FormControl>
                <Input placeholder="default" {...field} />
              </FormControl>
              <FormDescription>Default database name</FormDescription>
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
                : "Create ClickHouse Connection"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
