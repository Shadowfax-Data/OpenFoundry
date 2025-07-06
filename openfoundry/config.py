import os

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database configuration
DATABASE_URL = os.environ["DATABASE_URL"]

# Logging configuration
LOG_LEVEL = os.environ.get("LOG_LEVEL", "DEBUG").upper()

# OpenAI API configuration
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# Docker configuration
SANDBOX_IMAGE = os.environ.get("SANDBOX_IMAGE", "openfoundry-sandbox:latest")
SANDBOX_PORT = int(os.environ.get("SANDBOX_PORT", "8000"))

# Storage directory
STORAGE_DIR = os.path.abspath(os.environ.get("STORAGE_DIR", "storage"))
