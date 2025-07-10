import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useDropzone } from "react-dropzone";
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
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  createSnowflakeConnection,
  updateSnowflakeConnection,
  fetchSnowflakeConnection,
} from "@/store/slices/connectionsSlice";
import {
  SnowflakeConnectionCreate,
  SnowflakeConnectionUpdate,
} from "@/types/api";

const snowflakeConnectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  account: z.string().min(1, "Account is required"),
  user: z.string().min(1, "User is required"),
  role: z.string().min(1, "Role is required"),
  database: z.string().min(1, "Database is required"),
  warehouse: z.string().min(1, "Warehouse is required"),
  schema: z.string().min(1, "Schema is required"),
  private_key: z
    .string()
    .min(1, "Private key is required")
    .refine(
      (key) =>
        (key.startsWith("-----BEGIN PRIVATE KEY-----") &&
          key.trim().endsWith("-----END PRIVATE KEY-----")) ||
        (key.startsWith("-----BEGIN RSA PRIVATE KEY-----") &&
          key.trim().endsWith("-----END RSA PRIVATE KEY-----")),
      "Private key must be a valid RSA private key",
    ),
});

export function SnowflakeConnectionForm({
  connectionId,
}: {
  connectionId?: string;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isEditMode = connectionId !== undefined;
  const { currentConnection, loading, error } = useAppSelector(
    (state) => state.connections,
  );

  const form = useForm<z.infer<typeof snowflakeConnectionSchema>>({
    resolver: zodResolver(snowflakeConnectionSchema),
    defaultValues: {
      name: "",
      account: "",
      user: "",
      role: "",
      database: "",
      warehouse: "",
      schema: "",
      private_key: "",
    },
  });

  useEffect(() => {
    if (isEditMode) {
      dispatch(fetchSnowflakeConnection(connectionId!));
    }
  }, [isEditMode, connectionId, dispatch]);

  useEffect(() => {
    if (isEditMode && currentConnection) {
      form.reset({
        name: currentConnection.name,
        account: currentConnection.account,
        user: currentConnection.user,
        role: currentConnection.role,
        database: currentConnection.database,
        warehouse: currentConnection.warehouse,
        schema: currentConnection.schema,
        private_key: currentConnection.private_key,
      });
    }
  }, [isEditMode, currentConnection, form]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const reader = new FileReader();
        reader.onload = () => {
          const fileContent = reader.result as string;
          form.setValue("private_key", fileContent);
        };
        reader.readAsText(file);
      }
    },
    accept: {
      "text/plain": [".txt", ".pem", ".key"],
    },
    multiple: false,
    noClick: true,
  });

  async function onSubmit(values: z.infer<typeof snowflakeConnectionSchema>) {
    if (isEditMode) {
      await dispatch(
        updateSnowflakeConnection({
          connectionId: connectionId!,
          connectionData: values as SnowflakeConnectionUpdate,
        }),
      ).unwrap();
    } else {
      await dispatch(
        createSnowflakeConnection(values as SnowflakeConnectionCreate),
      ).unwrap();
    }
    navigate("/connections");
  }

  const handleCancel = () => {
    navigate("/connections");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My Snowflake Warehouse" {...field} />
              </FormControl>
              <FormDescription>
                A name to identify this warehouse
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="account"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl>
                <Input placeholder="org-account" {...field} />
              </FormControl>
              <FormDescription>Your Snowflake account name</FormDescription>
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
                <Input placeholder="SNOWFLAKE_USER" {...field} />
              </FormControl>
              <FormDescription>Your Snowflake username</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Input placeholder="ACCOUNTADMIN" {...field} />
              </FormControl>
              <FormDescription>Your Snowflake role</FormDescription>
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
                <Input placeholder="MY_DATABASE" {...field} />
              </FormControl>
              <FormDescription>Your Snowflake database name</FormDescription>
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
                <Input placeholder="PUBLIC" {...field} />
              </FormControl>
              <FormDescription>Your Snowflake schema name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="warehouse"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warehouse</FormLabel>
              <FormControl>
                <Input placeholder="COMPUTE_WH" {...field} />
              </FormControl>
              <FormDescription>Your Snowflake warehouse name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="private_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Private Key</FormLabel>
              <FormControl>
                <div
                  {...getRootProps()}
                  className={`relative rounded-md border text-sm transition-colors ${
                    isDragActive
                      ? "border-blue-300 border-dashed border-2 bg-blue-50"
                      : "border-input"
                  }`}
                  tabIndex={-1}
                >
                  <input {...getInputProps()} />
                  <Textarea
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    rows={10}
                    {...field}
                  />
                  {isDragActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <p className="text-sm font-medium">
                        Drop the file here ...
                      </p>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Private key for key-pair authentication. You can also drag and
                drop a .pem, .key, or .txt file here.
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
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditMode
                ? "Save Connection"
                : "Create Snowflake Connection"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
