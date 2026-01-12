from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.services.s3_uploader import S3Client
from src.models.upload import UploadResponse
from src.utils.logger import get_request_id, StructuredLogger
from config import get_settings
import logging
import os
import io

app = FastAPI(title="AWS S3 File Loader")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    bucket_name: str = None,
    upload_path: str = "",
    aws_access_key: str = Header(None, alias="X-AWS-Access-Key"),
    aws_secret_key: str = Header(None, alias="X-AWS-Secret-Key")
) -> UploadResponse:
    """Upload file to S3"""
    request_id = get_request_id()
    
    # Use provided credentials or fall back to settings
    access_key = aws_access_key or get_settings().aws_access_key_id
    secret_key = aws_secret_key or get_settings().aws_secret_access_key
    
    if not access_key or not secret_key:
        raise HTTPException(status_code=400, detail="AWS credentials not provided")
    
    settings = get_settings().model_copy(update={
        "aws_access_key_id": access_key,
        "aws_secret_access_key": secret_key
    })
    
    # Use provided bucket or default
    target_bucket = bucket_name or settings.s3_bucket_name
    if not target_bucket:
        raise HTTPException(status_code=400, detail="Bucket name not provided and S3_BUCKET_NAME not configured")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a name")
    
    # Validate file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size {file_size} exceeds maximum {settings.max_file_size}"
        )
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Validate MIME type
    if file.content_type and file.content_type not in settings.allowed_mime_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed"
        )
    
    StructuredLogger.log_upload_start(request_id, file.filename, file_size)
    
    # Generate S3 key with upload path (without request_id in path)
    s3_key = f"{upload_path.rstrip('/')}/{file.filename}" if upload_path else f"uploads/{file.filename}"
    
    # Reset file pointer after reading
    file.file.seek(0)
    
    # Upload to S3
    s3_client = S3Client(settings=settings)
    result = s3_client.upload_file_to_bucket(file.file, target_bucket, s3_key, request_id)
    
    if result["success"]:
        presigned_url = s3_client.generate_presigned_url_for_bucket(target_bucket, s3_key)
        return UploadResponse(
            success=True,
            file_key=s3_key,
            request_id=request_id,
            presigned_url=presigned_url
        )
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Upload failed"))

@app.get("/buckets")
async def list_buckets(
    aws_access_key: str = Header(None, alias="X-AWS-Access-Key"),
    aws_secret_key: str = Header(None, alias="X-AWS-Secret-Key")
):
    """List all S3 buckets"""
    # Use provided credentials or fall back to settings
    access_key = aws_access_key or get_settings().aws_access_key_id
    secret_key = aws_secret_key or get_settings().aws_secret_access_key
    
    if not access_key or not secret_key:
        raise HTTPException(status_code=400, detail="AWS credentials not provided")
    
    s3_client = S3Client(settings=get_settings().model_copy(update={
        "aws_access_key_id": access_key,
        "aws_secret_access_key": secret_key
    }))
    buckets = s3_client.list_buckets()
    return {"buckets": buckets}

@app.get("/buckets/{bucket_name}/objects")
async def list_bucket_objects(
    bucket_name: str,
    prefix: str = "",
    aws_access_key: str = Header(None, alias="X-AWS-Access-Key"),
    aws_secret_key: str = Header(None, alias="X-AWS-Secret-Key")
):
    """List objects in a specific bucket"""
    # Use provided credentials or fall back to settings
    access_key = aws_access_key or get_settings().aws_access_key_id
    secret_key = aws_secret_key or get_settings().aws_secret_access_key
    
    if not access_key or not secret_key:
        raise HTTPException(status_code=400, detail="AWS credentials not provided")
    
    s3_client = S3Client(settings=get_settings().model_copy(update={
        "aws_access_key_id": access_key,
        "aws_secret_access_key": secret_key
    }))
    objects = s3_client.list_objects(bucket_name, prefix)
    return objects

@app.get("/config")
async def get_config():
    """Get application configuration"""
    settings = get_settings()
    return {
        "max_file_size": settings.max_file_size,
        "max_file_size_mb": settings.max_file_size / (1024 * 1024),
        "allowed_mime_types": settings.allowed_mime_types,
        "aws_region": settings.aws_region
    }

@app.get("/download/{bucket_name}/{file_key:path}")
async def download_file(
    bucket_name: str,
    file_key: str,
    aws_access_key: str = Header(None, alias="X-AWS-Access-Key"),
    aws_secret_key: str = Header(None, alias="X-AWS-Secret-Key")
):
    """Download file from S3"""
    # Use provided credentials or fall back to settings
    access_key = aws_access_key or get_settings().aws_access_key_id
    secret_key = aws_secret_key or get_settings().aws_secret_access_key
    
    if not access_key or not secret_key:
        raise HTTPException(status_code=400, detail="AWS credentials not provided")
    
    settings = get_settings().model_copy(update={
        "aws_access_key_id": access_key,
        "aws_secret_access_key": secret_key
    })
    
    s3_client = S3Client(settings=settings)
    
    try:
        # Get file from S3
        file_data = s3_client.download_file(bucket_name, file_key)
        
        # Get content type from S3 object metadata
        metadata = s3_client.get_object_metadata(bucket_name, file_key)
        content_type = metadata.get('ContentType', 'application/octet-stream')
        
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={file_key.split('/')[-1]}"}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")

@app.delete("/delete/{bucket_name}")
async def delete_files(
    bucket_name: str,
    file_keys: list = Body(...),
    aws_access_key: str = Header(None, alias="X-AWS-Access-Key"),
    aws_secret_key: str = Header(None, alias="X-AWS-Secret-Key")
):
    """Delete multiple files from S3"""
    # Use provided credentials or fall back to settings
    access_key = aws_access_key or get_settings().aws_access_key_id
    secret_key = aws_secret_key or get_settings().aws_secret_access_key
    
    if not access_key or not secret_key:
        raise HTTPException(status_code=400, detail="AWS credentials not provided")
    
    settings = get_settings().model_copy(update={
        "aws_access_key_id": access_key,
        "aws_secret_access_key": secret_key
    })
    
    s3_client = S3Client(settings=settings)
    
    try:
        deleted_files = []
        failed_files = []
        
        for file_key in file_keys:
            try:
                s3_client.delete_object(bucket_name, file_key)
                deleted_files.append(file_key)
            except Exception as e:
                failed_files.append({"key": file_key, "error": str(e)})
        
        return {
            "success": True,
            "deleted": deleted_files,
            "failed": failed_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete operation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
