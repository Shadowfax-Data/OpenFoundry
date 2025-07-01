# Use Python 3.12 slim base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Poetry
RUN pip install --upgrade pip \
    && pip install poetry

# Copy dependency definitions and README
COPY pyproject.toml poetry.lock README.md ./

# Copy project source code (needed for poetry install to work)
COPY openfoundry /app/openfoundry

# Install dependencies without creating a virtualenv and without installing dev deps
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction

# Copy frontend code and build it
COPY frontend /app/frontend
WORKDIR /app/frontend
RUN npm ci && npm run build

# Go back to app directory
WORKDIR /app

# Expose FastAPI default port
EXPOSE 8000

# Launch the FastAPI application
CMD ["uvicorn", "openfoundry.server:app", "--host", "0.0.0.0", "--port", "8000"]
