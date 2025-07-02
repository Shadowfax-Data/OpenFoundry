# OpenFoundry Sandbox

This directory contains a simplified sandbox environment for OpenFoundry, based on the Shadowfax untrusted sandbox. It provides a FastAPI server that can execute code and manage processes in an isolated environment.

## Features

- **Process Control Block (PCB) API**: Run and manage processes with stdin/stdout/stderr handling
- **File Operations**: Read, write, and list files
- **Editor Integration**: String replacement editor using OpenHands ACI
- **Shell Execution**: Run shell commands with timeout support
- **Find API**: Search for files and content using regex patterns
- **PDF Text Extraction**: Extract text from PDF files
- **Streamlit App Visualization**: Take screenshots of Streamlit apps

## Key Components

- `sandbox_server.py`: Main FastAPI application
- `pcb_api.py` & `pcb.py`: Process control block for managing subprocesses
- `find_api.py`: File and content search functionality

## Usage

### Docker

1. Build the Docker image:
   ```bash
   docker build -t openfoundry-sandbox .
   ```

2. Run the container:
   ```bash
   docker run -p 8000:8000 openfoundry-sandbox
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /str_replace_editor` - File editing operations
- `POST /write_file` - Write content to a file
- `GET /read_file` - Read file content
- `GET /list_files` - List files and directories
- `POST /run_shell` - Execute shell commands
- `POST /processes/run` - Start a new process (PCB API)
- `GET /processes` - List all running processes
- `POST /visualize_app` - Take screenshot of Streamlit app

## Workspace

The sandbox operates on a `/workspace` directory by default. This is where files are read/written and processes are executed.

## Differences from Shadowfax Sandbox

This is a simplified version that removes:
- Pipeline-specific dependencies (Snowflake, Databricks, etc.)
- Trusted/untrusted separation
- Pipeline extraction and loading functionality
- Complex data warehouse integrations

This sandbox focuses on basic code execution, file operations, and process management.
