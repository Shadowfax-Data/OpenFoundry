import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useBigQueryConnection } from "@/hooks/useConnection";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  createBigQueryConnection,
  updateBigQueryConnection,
} from "@/store/slices/connectionsSlice";
import {
  BigQueryConnectionCreate,
  BigQueryConnectionUpdate,
} from "@/types/api";

const bigQueryConnectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  service_account_key: z.string().min(1, "Service account key is required"),
  project_id: z.string().min(1, "Project ID is required"),
  dataset_id: z.string().min(1, "Dataset ID is required"),
});

export function BigQueryConnectionForm({
  connectionId,
}: {
  connectionId?: string;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const isEditMode = connectionId !== undefined;
  const { loading, error } = useAppSelector((state) => state.connections);

  // Use the hook to fetch connection data
  const {
    connection: connectionData,
    loading: isLoadingConnection,
    error: connectionError,
  } = useBigQueryConnection(connectionId);

  const form = useForm<z.infer<typeof bigQueryConnectionSchema>>({
    resolver: zodResolver(bigQueryConnectionSchema),
    defaultValues: {
      name: "",
      service_account_key: "",
      project_id: "",
      dataset_id: "",
    },
  });

  // Populate form when connection data is loaded
  useEffect(() => {
    if (isEditMode && connectionData) {
      form.reset({
        name: connectionData.name,
        service_account_key: "********",
        project_id: connectionData.project_id,
        dataset_id: connectionData.dataset_id,
      });
    }
  }, [isEditMode, connectionData, form]);

  const handleFileUpload = useCallback(
    (file: File) => {
      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        alert("Please upload a valid JSON file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const jsonData = JSON.parse(content);

          // Validate that this looks like a Google Cloud service account key
          if (!jsonData.type || jsonData.type !== "service_account") {
            alert(
              "This doesn't appear to be a valid Google Cloud service account key file",
            );
            return;
          }

          if (!jsonData.project_id) {
            alert("Service account key file is missing project_id");
            return;
          }

          // Set the form values
          form.setValue("service_account_key", content);
          setUploadedFileName(file.name);
        } catch (error) {
          alert("Failed to parse JSON file: " + error);
        }
      };
      reader.readAsText(file);
    },
    [form],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload],
  );

  async function onSubmit(values: z.infer<typeof bigQueryConnectionSchema>) {
    // If the service account key is still the placeholder, we don't want to send it
    const submissionValues = { ...values };
    if (isEditMode && submissionValues.service_account_key === "********") {
      delete (submissionValues as Partial<typeof submissionValues>)
        .service_account_key;
    }

    if (isEditMode) {
      await dispatch(
        updateBigQueryConnection({
          connectionId: connectionId!,
          connectionData: submissionValues as BigQueryConnectionUpdate,
        }),
      ).unwrap();
    } else {
      await dispatch(
        createBigQueryConnection(submissionValues as BigQueryConnectionCreate),
      ).unwrap();
    }
    navigate("/connections");
  }

  const handleCancel = () => {
    navigate("/connections");
  };

  // Show loading state while fetching connection data
  if (isEditMode && isLoadingConnection) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Loading connection details...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if connection fetch failed
  if (isEditMode && connectionError) {
    return (
      <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
        {connectionError}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My BigQuery Connection" {...field} />
              </FormControl>
              <FormDescription>
                A name to identify this BigQuery connection
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_account_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Account Key</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* File Upload Area */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${
                        isDragOver
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      }
                      ${uploadedFileName ? "bg-green-50 border-green-300" : ""}
                    `}
                    onClick={() =>
                      document.getElementById("json-file-input")?.click()
                    }
                  >
                    <input
                      id="json-file-input"
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      {uploadedFileName ? (
                        <>
                          <div className="text-green-600">✓</div>
                          <p className="text-sm font-medium text-green-700">
                            {uploadedFileName}
                          </p>
                          <p className="text-xs text-green-600">
                            Click to upload a different file
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-gray-400"></div>
                          <p className="text-sm font-medium">
                            Drop your service account JSON file here
                          </p>
                          <p className="text-xs text-gray-500">
                            or click to browse files
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Hidden input that react-hook-form controls */}
                  <Input type="hidden" {...field} />
                </div>
              </FormControl>
              <FormDescription>
                Upload your Google Cloud service account JSON key file. This
                file contains the credentials needed to connect to BigQuery.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project ID</FormLabel>
              <FormControl>
                <Input placeholder="my-gcp-project" {...field} />
              </FormControl>
              <FormDescription>
                Google Cloud Project ID for your BigQuery connection
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dataset_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dataset ID</FormLabel>
              <FormControl>
                <Input placeholder="my_gcp_dataset" {...field} />
              </FormControl>
              <FormDescription>
                BigQuery Dataset ID for your BigQuery connection
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditMode
                ? "Save Connection"
                : "Create BigQuery Connection"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
