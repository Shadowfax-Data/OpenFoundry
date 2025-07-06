# ─────────────────────────────────────────────
# STAGE 1 — Build with full environment
# ─────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libffi-dev libssl-dev \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies with Poetry
COPY pyproject.toml poetry.lock /app/
WORKDIR /app
RUN pip install --upgrade pip poetry==2.1.2 \
 && poetry config virtualenvs.create false \
 && poetry install --no-interaction

# ─────────────────────────────────────────────
# STAGE 2 — Final minimal image
# ─────────────────────────────────────────────
FROM python:3.12-slim

ARG OPENFOUNDRY_BUILD_VERSION
ENV OPENFOUNDRY_BUILD_VERSION=$OPENFOUNDRY_BUILD_VERSION
ENV PYTHONDONTWRITEBYTECODE=1

# Copy Python packages from builder
COPY --from=builder /usr/local /usr/local

# Install basic system tools
RUN apt-get update \
 && apt-get install -y --no-install-recommends rsync git curl wget procps nano \
 && playwright install --with-deps chromium \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /tmp/*

# Copy source code
COPY . /app/
WORKDIR /app

# Create workspace directory
RUN mkdir -p /workspace

# Set the default command to run the untrusted server
CMD ["python", "-m", "uvicorn", "openfoundry_sandbox.sandbox_server:app", "--host", "0.0.0.0", "--port", "8000"]
