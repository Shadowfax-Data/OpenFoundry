import { SiClickhouse } from "@icons-pack/react-simple-icons";
import { useParams } from "react-router";

import { ClickhouseConnectionForm } from "@/components/connections/ClickhouseConnectionForm";
import ClickhouseConnectionGuide from "@/components/connections/ClickhouseConnectionGuide";
import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";

export function ClickhouseConnectionPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const isEditMode = Boolean(connectionId);

  return (
    <ConnectionPageLayout
      icon={
        <SiClickhouse className="h-12 w-12 text-yellow-400 flex-shrink-0" />
      }
      title={
        isEditMode ? "Edit ClickHouse Connection" : "New ClickHouse Connection"
      }
      subtitle={
        isEditMode
          ? "Update your ClickHouse database connection details."
          : "Fill in the details to create a new ClickHouse data warehouse connection."
      }
      form={<ClickhouseConnectionForm connectionId={connectionId} />}
      guide={<ClickhouseConnectionGuide />}
    />
  );
}
