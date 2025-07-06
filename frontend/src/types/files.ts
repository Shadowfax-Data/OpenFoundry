export interface DirectoryEntry {
  name: string;
  path: string;
  is_directory: boolean;
  modified_time?: number;
  is_binary?: boolean;
}

export interface ListFilesResponse {
  path: string;
  entries: DirectoryEntry[];
  parent_path?: string;
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  is_directory: boolean;
  modified_time: number;
  mime_type?: string;
}

export interface ReadFileResponse {
  path: string;
  content: string;
  is_binary: boolean;
  encoding?: string;
  file_info: FileInfo;
}

export interface WriteFileRequest {
  path: string;
  content: string;
  encoding?: string;
}

export interface WriteFileResponse {
  message: string;
  file_info: FileInfo;
}
