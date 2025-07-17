import { SiGooglebigquery } from "@icons-pack/react-simple-icons";
import { useParams } from "react-router";

import { BigQueryConnectionForm } from "@/components/connections/BigQueryConnectionForm";
import BigQueryConnectionGuide from "@/components/connections/BigQueryConnectionGuide";
import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";

export function BigQueryConnectionPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const isEditMode = Boolean(connectionId);

  return (
    <ConnectionPageLayout
      icon={
        <SiGooglebigquery className="h-12 w-12 text-blue-500 flex-shrink-0" />
      }
      title={
        isEditMode ? "Edit BigQuery Connection" : "New BigQuery Connection"
      }
      subtitle={
        isEditMode
          ? "Update your BigQuery connection details."
          : "Fill in the details to create a new BigQuery data warehouse connection."
      }
      form={<BigQueryConnectionForm connectionId={connectionId} />}
      guide={<BigQueryConnectionGuide />}
    />
  );
}
