import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")
    
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket_name: str = ""
    max_file_size: int = 5 * 1024 * 1024 * 1024  # 5GB
    allowed_mime_types: list = [
        "image/jpeg", "image/png", "image/gif",
        "application/pdf", "text/plain",
        "application/json", "application/octet-stream",
        "text/csv", "text/markdown"
    ]
    log_level: str = "INFO"

def get_settings() -> Settings:
    """Get settings instance, reading environment variables each time"""
    return Settings()

settings = get_settings()
