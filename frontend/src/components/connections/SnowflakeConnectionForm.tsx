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
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            value={snowflakeForm.name}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="account" className="text-right">
            Account
          </Label>
          <Input
            id="account"
            value={snowflakeForm.account}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="user" className="text-right">
            User
          </Label>
          <Input
            id="user"
            value={snowflakeForm.user}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="role" className="text-right">
            Role
          </Label>
          <Input
            id="role"
            value={snowflakeForm.role}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="database" className="text-right">
            Database
          </Label>
          <Input
            id="database"
            value={snowflakeForm.database}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="warehouse" className="text-right">
            Warehouse
          </Label>
          <Input
            id="warehouse"
            value={snowflakeForm.warehouse}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="schema" className="text-right">
            Schema
          </Label>
          <Input
            id="schema"
            value={snowflakeForm.schema}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="private_key" className="text-right pt-2">
            Private Key
          </Label>
          <textarea
            id="private_key"
            value={snowflakeForm.private_key}
            onChange={handleInputChange}
            className="col-span-3 border rounded-md p-2 h-32 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:border-gray-300 focus:outline-none focus:ring-0 w-full"
            placeholder="Paste your private key here..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSaveConnection} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Connection"}
        </Button>
      </div>
    </div>
  );
}
