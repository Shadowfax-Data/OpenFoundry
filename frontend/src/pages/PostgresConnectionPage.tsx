import { SiPostgresql } from "@icons-pack/react-simple-icons";
import { useParams } from "react-router";

import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";
import { PostgresConnectionForm } from "@/components/connections/PostgresConnectionForm";
import { PostgresConnectionGuide } from "@/components/connections/PostgresConnectionGuide";

export function PostgresConnectionPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const isEditMode = Boolean(connectionId);

  return (
    <ConnectionPageLayout
      icon={<SiPostgresql className="h-12 w-12 text-blue-600 flex-shrink-0" />}
      title={
        isEditMode ? "Edit Postgres Connection" : "New Postgres Connection"
      }
      subtitle={
        isEditMode
          ? "Update your Postgres database connection details."
          : "Fill in the details to create a new Postgres data warehouse connection."
      }
      form={<PostgresConnectionForm connectionId={connectionId} />}
      guide={<PostgresConnectionGuide />}
    />
  );
}
