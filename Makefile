# Variables
IMAGE_NAME := openfoundry:latest
DOCKER_FILE := Dockerfile

# Build the Docker image
docker-images:
	@echo "Building Docker image: $(IMAGE_NAME)"
	docker build -f $(DOCKER_FILE) -t $(IMAGE_NAME) .

# Start openfoundry backend locally
start-backend: install
	@echo "Starting openfoundry locally on http://localhost:8000"
	@poetry run uvicorn openfoundry.server:app --host 0.0.0.0 --port 8000 --reload

# Install all dependencies and setup development environment
install:
	@echo "Installing Python dependencies with Poetry..."
	poetry install --with dev
	@$(MAKE) install-frontend
	@$(MAKE) setup-precommit

# Install frontend dependencies
install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Setup pre-commit hooks
setup-precommit:
	@echo "Setting up pre-commit hooks..."
	poetry run pre-commit install
	@echo "Pre-commit hooks installed successfully!"

# Run pre-commit on all files
lint:
	@echo "Running pre-commit on all files..."
	poetry run pre-commit run --all-files

# Format code (alias for lint since ruff handles both)
format: lint

# Update pre-commit hooks
update-hooks:
	@echo "Updating pre-commit hooks..."
	poetry run pre-commit autoupdate

# Run frontend development server
start-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

# Build frontend for production
build-frontend:
	@echo "Building frontend for production..."
	cd frontend && npm run build

# Lint and format frontend code
lint-frontend:
	@echo "Linting and formatting frontend code..."
	cd frontend && npm run lint:fix

.PHONY: start-backend install install-frontend setup-precommit lint format update-hooks start-frontend build-frontend lint-frontend
