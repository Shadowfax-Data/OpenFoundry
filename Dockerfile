# Stage 1: Frontend builder
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Stage 2: Backend and final image
FROM python:3.12-slim
WORKDIR /app

# Upgrade pip and install Poetry
RUN pip install --upgrade pip \
    && pip install poetry \
    && rm -rf ~/.cache/pip

# Copy dependency definitions and shared types
COPY pyproject.toml poetry.lock ./
COPY shared-types /app/shared-types

# Install dependencies without creating a virtualenv and without installing dev deps
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --without dev \
    && rm -rf /root/.cache/pypoetry

# Copy project source code
COPY openfoundry /app/openfoundry
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Expose FastAPI default port
EXPOSE 8000

# Launch the FastAPI application
CMD ["uvicorn", "openfoundry.server:app", "--host", "0.0.0.0", "--port", "8000"]
