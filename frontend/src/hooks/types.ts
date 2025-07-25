// Define proper types for notebook outputs
export interface NotebookOutputData {
  "text/plain"?: string | string[];
  "text/html"?: string | string[];
  "image/png"?: string | string[];
  "image/jpeg"?: string | string[];
  "image/svg+xml"?: string | string[];
  [mimeType: string]: unknown;
}

export interface StreamOutput {
  output_type: "stream";
  name: "stdout" | "stderr";
  text: string | string[];
}

export interface ExecuteResultOutput {
  output_type: "execute_result";
  execution_count: number;
  data: NotebookOutputData;
  metadata?: Record<string, unknown>;
}

export interface ErrorOutput {
  output_type: "error";
  ename: string;
  evalue: string;
  traceback: string[];
}

export interface DisplayDataOutput {
  output_type: "display_data";
  data: NotebookOutputData;
  metadata?: Record<string, unknown>;
}

export type NotebookOutput =
  | StreamOutput
  | ExecuteResultOutput
  | ErrorOutput
  | DisplayDataOutput;

// Define event data types for streaming
export interface StartedEventData {
  execution_count?: number;
}

export interface OutputEventData {
  output: NotebookOutput;
}

export interface CompletedEventData {
  execution_count: number;
  outputs: NotebookOutput[];
  status: "completed" | "error";
  error?: string;
  started_at: string;
  completed_at: string;
}

export interface ErrorEventData {
  error: string;
  traceback?: string[];
}

export interface InterruptedEventData {
  message?: string;
}

export type StreamingEventData =
  | StartedEventData
  | OutputEventData
  | CompletedEventData
  | ErrorEventData
  | InterruptedEventData;

export interface NotebookCell {
  id: string;
  cell_type: "code" | "markdown";
  source: string[];
  outputs?: NotebookOutput[];
  execution_count?: number | null;
}

// Type for UI components that can handle both string and string[] sources
export interface NotebookCellInput {
  id: string;
  cell_type: "code" | "markdown";
  source: string[] | string;
  outputs?: NotebookOutput[];
  execution_count?: number | null;
}

export interface NotebookMetadata {
  kernelspec?: {
    display_name: string;
    language: string;
    name: string;
  };
  language_info?: {
    codemirror_mode?: {
      name: string;
      version?: number;
    };
    file_extension: string;
    mimetype: string;
    name: string;
    nbconvert_exporter: string;
    pygments_lexer: string;
    version: string;
  };
  [key: string]: unknown;
}

export interface NotebookData {
  cells: NotebookCell[];
  metadata: NotebookMetadata;
  nbformat: number;
  nbformat_minor: number;
}
