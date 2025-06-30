# Use Python 3.12 slim base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

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

# Expose FastAPI default port
EXPOSE 8000

# Launch the FastAPI application
CMD ["uvicorn", "openfoundry.server:app", "--host", "0.0.0.0", "--port", "8000"]
