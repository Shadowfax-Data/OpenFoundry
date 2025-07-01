import logging
import os

# Default log level from environment
LOG_LEVEL = os.environ.get("LOG_LEVEL", "DEBUG").upper()

logger = logging.getLogger("openfoundry")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(LOG_LEVEL)
logger.propagate = False
