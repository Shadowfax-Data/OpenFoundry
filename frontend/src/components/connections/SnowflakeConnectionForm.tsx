import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/store";
import { createSnowflakeConnection } from "@/store/slices/connectionsSlice";
import { SnowflakeConnectionCreate } from "@/types/api";

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

export function SnowflakeConnectionForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [snowflakeForm, setSnowflakeForm] = useState(initialSnowflakeFormState);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target;
    setSnowflakeForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveConnection = async () => {
    setIsSaving(true);
    try {
      await dispatch(createSnowflakeConnection(snowflakeForm)).unwrap();
      navigate("/connections");
    } catch (error) {
      console.error("Failed to create connection:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "An unknown error occurred"}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/connections");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={snowflakeForm.name}
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
            value={snowflakeForm.account}
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
            value={snowflakeForm.user}
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
            value={snowflakeForm.role}
            onChange={handleInputChange}
            placeholder="ACCOUNTADMIN"
          />
          <p className="text-xs text-muted-foreground">Your Snowflake role</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="database">Database</Label>
          <Input
            id="database"
            value={snowflakeForm.database}
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
            value={snowflakeForm.schema}
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
            value={snowflakeForm.warehouse}
            onChange={handleInputChange}
            placeholder="COMPUTE_WH"
          />
          <p className="text-xs text-muted-foreground">
            Your Snowflake warehouse name
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="private_key">Private Key</Label>
          <textarea
            id="private_key"
            value={snowflakeForm.private_key}
            onChange={handleInputChange}
            className="border rounded-md p-2 h-32 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:border-gray-300 focus:outline-none focus:ring-0 w-full"
            placeholder="Paste your private key here..."
          />
          <p className="text-xs text-muted-foreground">
            Private key for key-pair authentication
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSaveConnection} disabled={isSaving}>
          {isSaving ? "Saving..." : "Create Snowflake Connection"}
        </Button>
      </div>
    </div>
  );
}
