import logging

from openfoundry.config import LOG_LEVEL

logger = logging.getLogger("openfoundry")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(LOG_LEVEL)
logger.propagate = False
