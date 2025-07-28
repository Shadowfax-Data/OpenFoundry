# Variables
IMAGE_NAME := openfoundry:latest
DOCKER_FILE := Dockerfile
SANDBOX_IMAGE_NAME := openfoundry-sandbox:latest
SANDBOX_DOCKER_FILE := sandbox/Dockerfile

# Colors
GREEN=$(shell tput -Txterm setaf 2)
YELLOW=$(shell tput -Txterm setaf 3)
RESET=$(shell tput -Txterm sgr0)

# Build the Docker image
docker-images:
	@echo "Building Docker image: $(IMAGE_NAME)"
	docker build -f $(DOCKER_FILE) -t $(IMAGE_NAME) .

# Build the sandbox Docker image
docker-sandbox-images:
	@echo "Building sandbox Docker image: $(SANDBOX_IMAGE_NAME)"
	docker build -f $(SANDBOX_DOCKER_FILE) -t $(SANDBOX_IMAGE_NAME) .

# Start openfoundry backend locally
start-backend: install
	@echo "Starting openfoundry locally on http://localhost:8000"
	@poetry run uvicorn openfoundry.server:app --host 0.0.0.0 --port 8000 --reload --reload-dir="openfoundry"

# Install all dependencies and setup development environment
install:
	@echo "Installing Python dependencies with Poetry..."
	poetry install --with dev
	@$(MAKE) install-frontend
	@$(MAKE) setup-precommit
	@echo "Installing Python dependencies for sandbox with Poetry..."
	cd sandbox && poetry install --with dev

# Install frontend dependencies
install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Setup pre-commit hooks
setup-precommit:
	@echo "Setting up pre-commit hooks..."
	@echo "Checking if ggshield is installed..."
	@if ! command -v ggshield >/dev/null 2>&1; then \
		echo "❌ ggshield is not installed. Please install it first:"; \
		echo "   Visit: https://github.com/GitGuardian/ggshield"; \
		echo "   Or install on Linux:"; \
		echo "     wget https://github.com/GitGuardian/ggshield/releases/download/v1.41.0/ggshield_1.41.0-1_amd64.deb"; \
		echo "     sudo dpkg -i ggshield_1.41.0-1_amd64.deb"; \
		echo "   Or install on macOS:"; \
		echo "     brew install ggshield"; \
		exit 1; \
	fi
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

# Run development server for backend and frontend
run-openfoundry:
	@echo "$(YELLOW)Running alembic database migrations...$(RESET)"
	@poetry run alembic upgrade head
	@$(MAKE) build-frontend
	@echo "$(YELLOW)Starting openfoundry backend...$(RESET)"
	@poetry run uvicorn openfoundry.server:app --host 0.0.0.0 --port 8000 --reload --reload-dir="openfoundry" &
	@echo "$(YELLOW)Waiting for the backend to start...$(RESET)"
	@until nc -z localhost 8000; do sleep 0.1; done
	@echo "$(GREEN)Backend started successfully.$(RESET)"
	@$(MAKE) start-frontend

.PHONY: start-backend install install-frontend setup-precommit lint format update-hooks start-frontend build-frontend lint-frontend docker-sandbox-images run-openfoundry
