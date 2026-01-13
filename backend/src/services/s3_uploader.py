import time
import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException
from config import get_settings
from src.utils.logger import StructuredLogger
import logging

logger = logging.getLogger(__name__)

class S3Client:
    def __init__(self, settings=None):
        if settings is None:
            settings = get_settings()
        self.settings = settings
        self.s3 = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
    
    def upload_file(self, file_obj, file_key: str, request_id: str, max_retries: int = 3) -> dict:
        """Upload file to S3 with exponential backoff retry logic"""
        retry_count = 0
        
        while retry_count <= max_retries:
            try:
                self.s3.upload_fileobj(
                    file_obj,
                    self.settings.s3_bucket_name,
                    file_key,
                    ExtraArgs={"Metadata": {"request-id": request_id}}
                )
                StructuredLogger.log_upload_success(request_id, file_key, file_key)
                return {"success": True, "s3_key": file_key}
            
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                
                # Exponential backoff for transient errors
                if error_code in ["ThrottlingException", "InternalError", "ServiceUnavailable"]:
                    if retry_count < max_retries:
                        wait_time = 2 ** retry_count
                        logger.warning(f"Transient error {error_code}, retrying in {wait_time}s")
                        time.sleep(wait_time)
                        retry_count += 1
                        continue
                
                StructuredLogger.log_upload_error(request_id, file_key, str(e), retry_count)
                return {"success": False, "error": str(e), "retries": retry_count}
            
            except Exception as e:
                StructuredLogger.log_upload_error(request_id, file_key, str(e), retry_count)
                return {"success": False, "error": str(e), "retries": retry_count}
        
        return {"success": False, "error": "Max retries exceeded", "retries": retry_count}
    
    def list_buckets(self) -> list:
        """List all S3 buckets for the account"""
        try:
            response = self.s3.list_buckets()
            buckets = [{"name": bucket["Name"], "creation_date": bucket["CreationDate"].isoformat()} 
                      for bucket in response.get("Buckets", [])]
            return buckets
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = e.response.get("Error", {}).get("Message", "Unknown error")
            logger.error(f"AWS ClientError listing buckets - Code: {error_code}, Message: {error_msg}")
            raise HTTPException(status_code=401, detail=f"AWS authentication failed: {error_msg}")
        except Exception as e:
            logger.error(f"Failed to list buckets: {type(e).__name__}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to list buckets: {str(e)}")
    
    def list_objects(self, bucket_name: str, prefix: str = "", delimiter: str = "/") -> dict:
        """List objects in a bucket with optional prefix (for folder navigation)"""
        try:
            params = {
                "Bucket": bucket_name,
                "Delimiter": delimiter
            }
            if prefix:
                params["Prefix"] = prefix
            
            response = self.s3.list_objects_v2(**params)
            
            folders = [{"name": obj["Prefix"].rstrip("/").split("/")[-1], 
                       "prefix": obj["Prefix"]} 
                      for obj in response.get("CommonPrefixes", [])]
            
            files = [{"name": obj["Key"].split("/")[-1], 
                     "key": obj["Key"], 
                     "size": obj["Size"], 
                     "last_modified": obj["LastModified"].isoformat()} 
                    for obj in response.get("Contents", []) 
                    if obj["Key"] != prefix]  # Exclude the prefix itself if it's a file
            
            return {
                "folders": folders,
                "files": files,
                "current_prefix": prefix
            }
        except Exception as e:
            logger.error(f"Failed to list objects in {bucket_name}/{prefix}: {e}")
            return {"folders": [], "files": [], "current_prefix": prefix}
    
    def upload_file_to_bucket(self, file_obj, bucket_name: str, file_key: str, request_id: str, max_retries: int = 3) -> dict:
        """Upload file to a specific S3 bucket with exponential backoff retry logic"""
        retry_count = 0
        
        while retry_count <= max_retries:
            try:
                self.s3.upload_fileobj(
                    file_obj,
                    bucket_name,
                    file_key,
                    ExtraArgs={"Metadata": {"request-id": request_id}}
                )
                StructuredLogger.log_upload_success(request_id, file_key, file_key)
                return {"success": True, "s3_key": file_key}
            
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                
                # Exponential backoff for transient errors
                if error_code in ["ThrottlingException", "InternalError", "ServiceUnavailable"]:
                    if retry_count < max_retries:
                        wait_time = 2 ** retry_count
                        logger.warning(f"Transient error {error_code}, retrying in {wait_time}s")
                        time.sleep(wait_time)
                        retry_count += 1
                        continue
                
                StructuredLogger.log_upload_error(request_id, file_key, str(e), retry_count)
                return {"success": False, "error": str(e), "retries": retry_count}
            
            except Exception as e:
                StructuredLogger.log_upload_error(request_id, file_key, str(e), retry_count)
                return {"success": False, "error": str(e), "retries": retry_count}
        
        return {"success": False, "error": "Max retries exceeded", "retries": retry_count}
    
    def generate_presigned_url_for_bucket(self, bucket_name: str, file_key: str, expiration: int = 3600) -> str:
        """Generate presigned URL for a specific bucket"""
        try:
            url = self.s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket_name, "Key": file_key},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return ""
    
    def download_file(self, bucket_name: str, file_key: str) -> bytes:
        """Download file from S3 bucket"""
        try:
            response = self.s3.get_object(Bucket=bucket_name, Key=file_key)
            return response['Body'].read()
        except Exception as e:
            logger.error(f"Failed to download file {file_key} from {bucket_name}: {e}")
            raise e
    
    def delete_object(self, bucket_name: str, file_key: str) -> bool:
        """Delete object from S3 bucket"""
        try:
            self.s3.delete_object(Bucket=bucket_name, Key=file_key)
            logger.info(f"Successfully deleted {file_key} from {bucket_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete {file_key} from {bucket_name}: {e}")
            raise e
    
    def get_object_metadata(self, bucket_name: str, file_key: str) -> dict:
        """Get object metadata from S3 bucket"""
        try:
            response = self.s3.head_object(Bucket=bucket_name, Key=file_key)
            return {
                'ContentType': response.get('ContentType', 'application/octet-stream'),
                'ContentLength': response.get('ContentLength', 0),
                'LastModified': response.get('LastModified'),
                'ETag': response.get('ETag')
            }
        except Exception as e:
            logger.error(f"Failed to get metadata for {file_key} from {bucket_name}: {e}")
            return {'ContentType': 'application/octet-stream'}
