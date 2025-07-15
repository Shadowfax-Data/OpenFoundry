# Notebook API Documentation

This API server provides endpoints for executing Python code in a persistent Jupyter kernel. The kernel maintains state between executions, allowing you to build upon previous code executions.

## Features

- **Persistent Jupyter Kernel**: Code executions maintain state (variables, imports, etc.)
- **Complete Output Capture**: Captures stdout, stderr, return values, and errors
- **Execution History**: Track and retrieve results from all executed cells
- **Error Handling**: Proper error capture without breaking the kernel
- **Kernel Management**: Start, restart, and monitor kernel status

## API Endpoints

### Execute Code
```bash
POST /api/notebook/execute
```

Execute Python code in the kernel.

**Request Body:**
```json
{
  "code": "print('Hello World')\nx = 42",
  "cell_id": "optional-custom-id"
}
```

**Response:**
```json
{
  "cell_id": "7243551e-d1d2-4363-ab60-9f3780291594",
  "code": "print('Hello World')\nx = 42",
  "execution_count": 1,
  "outputs": [
    {
      "output_type": "stream",
      "name": "stdout",
      "text": "Hello World\n"
    }
  ],
  "status": "completed",
  "error": null,
  "started_at": "2025-07-15T22:01:51.631426",
  "completed_at": "2025-07-15T22:01:51.637094"
}
```

### Get Kernel Status
```bash
GET /api/notebook/status
```

Check if the kernel is ready for execution.

**Response:**
```json
{
  "is_ready": true,
  "is_starting": false,
  "execution_count": 4,
  "kernel_id": "9eae530b-8082-44e1-b4dd-6976613ab2bc"
}
```

### Get Execution Result
```bash
GET /api/notebook/results/{cell_id}
```

Retrieve the result of a specific cell execution.

### List All Results
```bash
GET /api/notebook/results
```

Get all execution results from the current session.

### Restart Kernel
```bash
POST /api/notebook/restart
```

Restart the kernel (clears all variables and state).

### Start Kernel
```bash
POST /api/notebook/start
```

Manually start the kernel (usually done automatically).

### Health Check
```bash
GET /api/notebook/health
```

Check the health status of the notebook functionality.

### Clear Results
```bash
DELETE /api/notebook/clear-results
```

Clear stored execution results (keeps kernel running).

## Usage Examples

### Basic Code Execution
```bash
curl -X POST http://localhost:8000/api/notebook/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello from Jupyter!\")"}'
```

### Variable Persistence
```bash
# First execution
curl -X POST http://localhost:8000/api/notebook/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "x = 42\nprint(f\"x = {x}\")"}'

# Second execution (x is still available)
curl -X POST http://localhost:8000/api/notebook/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "y = x * 2\nprint(f\"y = {y}\")"}'
```

### Using Libraries
```bash
curl -X POST http://localhost:8000/api/notebook/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "import numpy as np\narr = np.array([1,2,3])\nprint(np.sum(arr))"}'
```

## Output Types

The API captures several types of outputs:

1. **Stream Output**: Print statements, stdout/stderr
2. **Execute Result**: Return values from expressions
3. **Display Data**: Rich display outputs (plots, HTML, etc.)
4. **Error Output**: Exception tracebacks and error messages

## Error Handling

When code execution fails, the error is captured in the output without breaking the kernel:

```json
{
  "outputs": [
    {
      "output_type": "error",
      "ename": "NameError",
      "evalue": "name 'undefined_variable' is not defined",
      "traceback": ["... full traceback ..."]
    }
  ],
  "status": "completed"
}
```

## Starting the Server

```bash
poetry install
poetry run uvicorn openfoundry.server:app --host 0.0.0.0 --port 8000 --reload
```

The Jupyter kernel is automatically started when the server starts up and will be available at the `/api/notebook/*` endpoints.
