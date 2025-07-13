import { SiDatabricks } from "@icons-pack/react-simple-icons";
import { useParams } from "react-router";

import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";
import { DatabricksConnectionForm } from "@/components/connections/DatabricksConnectionForm";
import DatabricksConnectionGuide from "@/components/connections/DatabricksConnectionGuide";

export function DatabricksConnectionPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const isEditMode = Boolean(connectionId);

  return (
    <ConnectionPageLayout
      icon={
        <SiDatabricks className="h-12 w-12 text-orange-500 flex-shrink-0" />
      }
      title={
        isEditMode ? "Edit Databricks Connection" : "New Databricks Connection"
      }
      subtitle={
        isEditMode
          ? "Update your Databricks SQL connection details."
          : "Fill in the details to create a new Databricks SQL connection."
      }
      form={<DatabricksConnectionForm connectionId={connectionId} />}
      guide={<DatabricksConnectionGuide />}
    />
  );
}
