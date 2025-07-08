import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialFormState = {
  name: "",
  host: "",
  httpPath: "",
  token: "",
  catalog: "",
  schema: "",
};

export function DatabricksConnectionForm() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState(initialFormState);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormState((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveConnection = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement createDatabricksConnection
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
            value={formState.name}
            onChange={handleInputChange}
            placeholder="My Databricks Warehouse"
          />
          <p className="text-xs text-muted-foreground">
            A name to identify this warehouse
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            value={formState.host}
            onChange={handleInputChange}
            placeholder="xxxx.cloud.databricks.com"
          />
          <p className="text-xs text-muted-foreground">
            Databricks workspace URL (e.g., xxxx.cloud.databricks.com)
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="httpPath">HTTP Path</Label>
          <Input
            id="httpPath"
            value={formState.httpPath}
            onChange={handleInputChange}
            placeholder="/sql/1.0/warehouses/xxx"
          />
          <p className="text-xs text-muted-foreground">
            SQL Warehouse HTTP Path
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="token">Personal Access Token (PAT)</Label>
          <Input
            id="token"
            type="password"
            value={formState.token}
            onChange={handleInputChange}
            placeholder="dapi..."
          />
          <p className="text-xs text-muted-foreground">
            Databricks Personal Access Token
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="catalog">Catalog</Label>
          <Input
            id="catalog"
            value={formState.catalog}
            onChange={handleInputChange}
            placeholder="my_catalog"
          />
          <p className="text-xs text-muted-foreground">Default catalog name</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="schema">Schema</Label>
          <Input
            id="schema"
            value={formState.schema}
            onChange={handleInputChange}
            placeholder="my_schema"
          />
          <p className="text-xs text-muted-foreground">Default schema name</p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSaveConnection} disabled={isSaving}>
          {isSaving ? "Saving..." : "Create Databricks Connection"}
        </Button>
      </div>
    </div>
  );
}
