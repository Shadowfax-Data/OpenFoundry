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
