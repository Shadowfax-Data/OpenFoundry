import os

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database configuration
if "DATABASE_URL" not in os.environ:
    print(
        "Error: DATABASE_URL environment variable not set.\n"
        "You need to provide a PostgreSQL database URL.\n"
        "You can get a free Postgres database at https://neon.new/db"
    )
    exit(1)
DATABASE_URL = os.environ["DATABASE_URL"]

# OpenAI API configuration
if "OPENAI_API_KEY" not in os.environ:
    print(
        "Error: OPENAI_API_KEY environment variable not set.\n"
        "You need to provide an OpenAI API key.\n"
        "You can create one at https://platform.openai.com/api-keys"
    )
    exit(1)
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# Logging configuration
LOG_LEVEL = os.environ.get("LOG_LEVEL", "DEBUG").upper()

# Docker configuration
SANDBOX_IMAGE = os.environ.get("SANDBOX_IMAGE", "openfoundry-sandbox:latest")
SANDBOX_PORT = int(os.environ.get("SANDBOX_PORT", "8000"))

# Storage directory
STORAGE_DIR = os.path.abspath(os.environ.get("STORAGE_DIR", "storage"))
