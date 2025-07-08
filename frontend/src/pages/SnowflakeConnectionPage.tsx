import { SnowflakeConnectionForm } from "@/components/connections/SnowflakeConnectionForm";
import { IconBrandSnowflake } from "@tabler/icons-react";
import SnowflakeConnectionGuide from "@/components/connections/SnowflakeConnectionGuide";
import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";

export function SnowflakeConnectionPage() {
  return (
    <ConnectionPageLayout
      icon={
        <IconBrandSnowflake className="h-12 w-12 text-blue-500 flex-shrink-0" />
      }
      title="New Snowflake Connection"
      subtitle="Fill in the details to create a new Snowflake connection."
      form={<SnowflakeConnectionForm />}
      guide={<SnowflakeConnectionGuide />}
    />
  );
}
