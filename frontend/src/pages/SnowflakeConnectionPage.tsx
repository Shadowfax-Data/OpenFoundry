import { SiSnowflake } from "@icons-pack/react-simple-icons";
import { useParams } from "react-router";

import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";
import { SnowflakeConnectionForm } from "@/components/connections/SnowflakeConnectionForm";
import SnowflakeConnectionGuide from "@/components/connections/SnowflakeConnectionGuide";

export function SnowflakeConnectionPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const isEditMode = Boolean(connectionId);

  return (
    <ConnectionPageLayout
      icon={<SiSnowflake className="h-12 w-12 text-blue-500 flex-shrink-0" />}
      title={
        isEditMode ? "Edit Snowflake Connection" : "New Snowflake Connection"
      }
      subtitle={
        isEditMode
          ? "Update the details for your Snowflake connection."
          : "Fill in the details to create a new Snowflake connection."
      }
      form={<SnowflakeConnectionForm connectionId={connectionId} />}
      guide={<SnowflakeConnectionGuide />}
    />
  );
}
