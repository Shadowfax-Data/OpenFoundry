import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const initialSnowflakeFormState: SnowflakeConnectionCreate = {
  name: "",
  account: "",
  user: "",
  role: "",
  database: "",
  warehouse: "",
  schema: "",
  private_key: "",
};

export function SnowflakeConnectionForm({
  connectionId,
}: {
  connectionId?: string;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [snowflakeForm, setSnowflakeForm] = useState<
    SnowflakeConnectionCreate | SnowflakeConnectionUpdate
  >(initialSnowflakeFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditMode = connectionId !== undefined;

  const { currentConnection } = useAppSelector((state) => state.connections);

  useEffect(() => {
    if (isEditMode) {
      dispatch(fetchSnowflakeConnection(connectionId!));
    }
  }, [isEditMode, connectionId, dispatch]);

  useEffect(() => {
    if (isEditMode && currentConnection) {
      setSnowflakeForm({
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
  }, [isEditMode, currentConnection]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target;
    setSnowflakeForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveConnection = async () => {
    setIsSaving(true);
    setErrorMessage(null); // Clear previous errors
    try {
      if (isEditMode) {
        await dispatch(
          updateSnowflakeConnection({
            connectionId: connectionId!,
            connectionData: snowflakeForm as SnowflakeConnectionUpdate,
          }),
        ).unwrap();
      } else {
        await dispatch(
          createSnowflakeConnection(snowflakeForm as SnowflakeConnectionCreate),
        ).unwrap();
      }
      navigate("/connections");
    } catch (error) {
      let message = "An unknown error occurred";
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "string") {
        message = error;
      } else if (error && typeof error === "object" && "detail" in error) {
        // FastAPI often returns { detail: "..." }
        message = (error as { detail: string }).detail;
      }
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/connections");
  };

  const handleFileDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (
        file.type === "text/plain" ||
        file.name.endsWith(".pem") ||
        file.name.endsWith(".key")
      ) {
        try {
          const content = await file.text();
          setSnowflakeForm((prev) => ({ ...prev, private_key: content }));
        } catch (error) {
          console.error("Failed to read file:", error);
        }
      }
    }
    setIsDragOver(false);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFileDrop,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    accept: {
      "text/plain": [".txt", ".pem", ".key"],
    },
    multiple: false,
    noClick: true,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={snowflakeForm.name || ""}
            onChange={handleInputChange}
            placeholder="My Snowflake Warehouse"
          />
          <p className="text-xs text-muted-foreground">
            A name to identify this warehouse
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="account">Account</Label>
          <Input
            id="account"
            value={snowflakeForm.account || ""}
            onChange={handleInputChange}
            placeholder="org-account"
          />
          <p className="text-xs text-muted-foreground">
            Your Snowflake account name
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user">User</Label>
          <Input
            id="user"
            value={snowflakeForm.user || ""}
            onChange={handleInputChange}
            placeholder="SNOWFLAKE_USER"
          />
          <p className="text-xs text-muted-foreground">
            Your Snowflake username
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={snowflakeForm.role || ""}
            onChange={handleInputChange}
            placeholder="ACCOUNTADMIN"
          />
          <p className="text-xs text-muted-foreground">Your Snowflake role</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="database">Database</Label>
          <Input
            id="database"
            value={snowflakeForm.database || ""}
            onChange={handleInputChange}
            placeholder="MY_DATABASE"
          />
          <p className="text-xs text-muted-foreground">
            Your Snowflake database name
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="schema">Schema</Label>
          <Input
            id="schema"
            value={snowflakeForm.schema || ""}
            onChange={handleInputChange}
            placeholder="PUBLIC"
          />
          <p className="text-xs text-muted-foreground">
            Your Snowflake schema name
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="warehouse">Warehouse</Label>
          <Input
            id="warehouse"
            value={snowflakeForm.warehouse || ""}
            onChange={handleInputChange}
            placeholder="COMPUTE_WH"
          />
          <p className="text-xs text-muted-foreground">
            Your Snowflake warehouse name
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="private_key">Private Key</Label>
          <div
            {...getRootProps()}
            tabIndex={-1}
            className={`text-sm bg-background text-foreground placeholder:text-muted-foreground w-full relative ${
              isDragOver
                ? "bg-blue-50 border-2 border-blue-300 border-dashed"
                : ""
            }`}
          >
            <input {...getInputProps()} />
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 rounded-md z-10">
                <div className="text-center text-blue-600">
                  <p className="text-sm font-medium">
                    Drop your private key file here
                  </p>
                </div>
              </div>
            )}
            <Textarea
              id="private_key"
              value={snowflakeForm.private_key || ""}
              rows={10}
              onChange={handleInputChange}
              placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEpAIBAAKCAQEA...&#10;-----END RSA PRIVATE KEY-----"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Private key for key-pair authentication. You can also drag and drop
            a .pem, .key, or .txt file here.
          </p>
        </div>
      </div>
      {errorMessage && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-red-700">
          {errorMessage}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSaveConnection} disabled={isSaving}>
          {isSaving
            ? "Saving..."
            : isEditMode
              ? "Save Connection"
              : "Create Snowflake Connection"}
        </Button>
      </div>
    </div>
  );
}
