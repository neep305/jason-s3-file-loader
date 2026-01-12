import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

def get_request_id() -> str:
    return str(uuid.uuid4())

def setup_logging(log_level: str = "INFO"):
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

class StructuredLogger:
    @staticmethod
    def log_upload_start(request_id: str, filename: str, file_size: int):
        logger.info(f"Upload started | request_id={request_id} | filename={filename} | size_bytes={file_size}")
    
    @staticmethod
    def log_upload_success(request_id: str, filename: str, s3_key: str):
        logger.info(f"Upload succeeded | request_id={request_id} | filename={filename} | s3_key={s3_key}")
    
    @staticmethod
    def log_upload_error(request_id: str, filename: str, error: str, retry_count: int = 0):
        logger.error(f"Upload failed | request_id={request_id} | filename={filename} | error={error} | retries={retry_count}")
