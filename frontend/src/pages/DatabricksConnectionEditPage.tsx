import { useParams } from "react-router";
import { IconBrandDatabricks } from "@tabler/icons-react";
import { DatabricksConnectionForm } from "@/components/connections/DatabricksConnectionForm";
import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";

export function DatabricksConnectionEditPage() {
  const { connectionId } = useParams<{ connectionId: string }>();

  return (
    <ConnectionPageLayout
      icon={
        <IconBrandDatabricks className="h-12 w-12 text-orange-500 flex-shrink-0" />
      }
      title="Edit Databricks Connection"
      subtitle="Update your Databricks SQL connection details."
      form={<DatabricksConnectionForm connectionId={connectionId} />}
      guide={null}
    />
  );
}
