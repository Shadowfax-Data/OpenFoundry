import { SnowflakeConnectionForm } from "@/components/connections/SnowflakeConnectionForm";

export function SnowflakeConnectionPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto">
        <div className="p-8 mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">New Snowflake Connection</h1>
            <p className="text-muted-foreground">
              Fill in the details to create a new Snowflake connection.
            </p>
          </div>
          <SnowflakeConnectionForm />
        </div>
      </div>
    </div>
  );
}
