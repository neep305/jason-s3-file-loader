import pytest
from starlette.testclient import TestClient
from moto import mock_s3
import boto3
from main import app
from config import settings
import os

client = TestClient(app=app)

@pytest.fixture
@mock_s3
def aws_setup():
    """Mock AWS S3 for testing"""
    conn = boto3.resource("s3", region_name=settings.aws_region)
    conn.create_bucket(Bucket=settings.s3_bucket_name or "test-bucket")
    os.environ["S3_BUCKET_NAME"] = "test-bucket"
    yield conn

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_get_config():
    response = client.get("/config")
    assert response.status_code == 200
    data = response.json()
    assert "allowed_mime_types" in data
    assert "max_file_size" in data

def test_upload_file_no_bucket_configured(monkeypatch):
    monkeypatch.setenv("S3_BUCKET_NAME", "")
    response = client.post("/upload", files={"file": ("test.txt", b"test content")})
    assert response.status_code == 400

def test_upload_empty_file(monkeypatch):
    monkeypatch.setenv("S3_BUCKET_NAME", "test-bucket")
    response = client.post("/upload", files={"file": ("test.txt", b"")})
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

@mock_s3
def test_upload_file_success(monkeypatch):
    monkeypatch.setenv("S3_BUCKET_NAME", "test-bucket")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    
    # Create mock bucket
    conn = boto3.resource("s3", region_name=settings.aws_region)
    conn.create_bucket(Bucket="test-bucket")
    
    file_content = b"test file content"
    response = client.post(
        "/upload",
        files={"file": ("test.txt", file_content, "text/plain")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "file_key" in data
    assert "request_id" in data

def test_upload_unsupported_file_type(monkeypatch):
    monkeypatch.setenv("S3_BUCKET_NAME", "test-bucket")
    response = client.post(
        "/upload",
        files={"file": ("test.exe", b"binary content", "application/x-msdownload")}
    )
    assert response.status_code == 400
