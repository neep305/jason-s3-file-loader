from pydantic import BaseModel
from typing import Optional

class UploadRequest(BaseModel):
    bucket_name: Optional[str] = None
    
class UploadResponse(BaseModel):
    success: bool
    file_key: Optional[str] = None
    error: Optional[str] = None
    request_id: str
    presigned_url: Optional[str] = None
