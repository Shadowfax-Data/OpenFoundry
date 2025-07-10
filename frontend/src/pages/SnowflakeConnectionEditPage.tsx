import { SnowflakeConnectionForm } from "@/components/connections/SnowflakeConnectionForm";
import { IconBrandSnowflake } from "@tabler/icons-react";
import SnowflakeConnectionGuide from "@/components/connections/SnowflakeConnectionGuide";
import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";
import { useParams } from "react-router";

export function SnowflakeConnectionEditPage() {
  const { connectionId } = useParams<{ connectionId: string }>();

  return (
    <ConnectionPageLayout
      icon={
        <IconBrandSnowflake className="h-12 w-12 text-blue-500 flex-shrink-0" />
      }
      title="Edit Snowflake Connection"
      subtitle="Update the details for your Snowflake connection."
      form={<SnowflakeConnectionForm connectionId={connectionId} />}
      guide={<SnowflakeConnectionGuide />}
    />
  );
}
