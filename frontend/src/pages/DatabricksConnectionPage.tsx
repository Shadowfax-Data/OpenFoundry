import { IconBrandDatabricks } from "@tabler/icons-react";
import { DatabricksConnectionForm } from "@/components/connections/DatabricksConnectionForm";
import DatabricksConnectionGuide from "@/components/connections/DatabricksConnectionGuide";
import { ConnectionPageLayout } from "@/components/connections/ConnectionPageLayout";

export function DatabricksConnectionPage() {
  return (
    <ConnectionPageLayout
      icon={
        <IconBrandDatabricks className="h-12 w-12 text-orange-500 flex-shrink-0" />
      }
      title="New Databricks Connection"
      subtitle="Fill in the details to create a new Databricks SQL connection."
      form={<DatabricksConnectionForm />}
      guide={<DatabricksConnectionGuide />}
    />
  );
}
