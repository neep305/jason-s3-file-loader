# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS S3 File Loader is a full-stack application for uploading, browsing, downloading, and managing files in Amazon S3 buckets. The application supports dynamic AWS credential management via the UI, allowing users to switch between different AWS accounts without restarting services.

**Stack:**
- Backend: FastAPI (Python), boto3 for S3 operations
- Frontend: React + Vite, Tailwind CSS
- Testing: pytest with moto for S3 mocking
- Deployment: Docker Compose, Railway-ready

## Common Commands

### Development with Docker Compose (Recommended)

```bash
# Build all services
docker-compose build

# Start services (development mode with hot reload)
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Clean up everything (including volumes)
docker-compose down -v
```

### Using Makefile

```bash
make up          # Start all services
make up-d        # Start in detached mode
make down        # Stop services
make logs        # View all logs
make test        # Run backend tests
make clean       # Remove containers, volumes, and cache
make health      # Check service health
make ps          # Show running containers
```

### Backend Development (Local)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py

# Run tests
pytest tests/
pytest tests/ -v      # Verbose output
pytest tests/ -q      # Quiet output
```

### Frontend Development (Local)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

Backend tests use `moto` to mock S3 responses, so no AWS credentials are needed for testing:

```bash
# Docker Compose
docker-compose exec backend pytest tests/ -v

# Local
cd backend && pytest tests/
```

## Architecture & Code Structure

### Backend Architecture

**Request Flow:**
1. FastAPI endpoint ([main.py](backend/main.py)) receives request
2. AWS credentials from headers (X-AWS-Access-Key, X-AWS-Secret-Key) or environment
3. `S3Client` ([src/services/s3_uploader.py](backend/src/services/s3_uploader.py)) handles S3 operations
4. Retry logic with exponential backoff for transient errors
5. Structured logging via `StructuredLogger` ([src/utils/logger.py](backend/src/utils/logger.py))

**Key Backend Components:**

- [backend/main.py](backend/main.py): FastAPI application with all API endpoints
  - `/health` - Health check
  - `/config` - Get file size limits and allowed MIME types
  - `/upload` - Upload file to S3 (supports dynamic bucket and path)
  - `/buckets` - List all S3 buckets for current credentials
  - `/buckets/{bucket_name}/objects` - List objects/folders in bucket with prefix support
  - `/download/{bucket_name}/{file_key}` - Download file from S3
  - `/delete/{bucket_name}` - Delete multiple files from S3

- [backend/config/settings.py](backend/config/settings.py): Pydantic settings for configuration
  - Uses `pydantic_settings` to load from environment variables
  - `get_settings()` returns fresh instance each time (important for dynamic credential updates)

- [backend/src/services/s3_uploader.py](backend/src/services/s3_uploader.py): S3Client wrapper
  - All S3 operations go through this class
  - Exponential backoff retry for `ThrottlingException`, `InternalError`, `ServiceUnavailable`
  - Max retries: 3 with wait times of 1s, 2s, 4s
  - Methods: `upload_file_to_bucket`, `list_buckets`, `list_objects`, `download_file`, `delete_object`, `generate_presigned_url_for_bucket`

- [backend/src/models/upload.py](backend/src/models/upload.py): Pydantic models for request/response validation

- [backend/src/utils/logger.py](backend/src/utils/logger.py): Structured logging with request IDs

### Frontend Architecture

**Component Structure:**

- [frontend/src/App.jsx](frontend/src/App.jsx): Main app wrapper
- [frontend/src/components/FileUpload.jsx](frontend/src/components/FileUpload.jsx): Main UI component (~600 lines)
  - Handles AWS credential management (localStorage persistence)
  - Bucket listing and selection
  - Folder navigation with breadcrumb history
  - Multi-file selection for download/delete
  - Upload with progress bar (simulated, see line 280-282)
  - Delete confirmation modal requiring "delete" text input

- [frontend/src/utils/api.js](frontend/src/utils/api.js): API client
  - All backend calls go through this module
  - Injects AWS credentials as headers (`X-AWS-Access-Key`, `X-AWS-Secret-Key`)

**State Management:**

Frontend uses React `useState` for:
- AWS credentials (persisted to localStorage)
- Current bucket, path, navigation history
- File selection for bulk operations
- Upload/download progress tracking

### Dynamic Credential System

**Critical Implementation Detail:**

AWS credentials can be provided in two ways:
1. Environment variables (`.env` file) - default for docker-compose
2. HTTP headers (`X-AWS-Access-Key`, `X-AWS-Secret-Key`) - used by frontend for dynamic switching

The frontend stores credentials in localStorage and injects them as headers on every API request. The backend accepts these headers and uses `settings.model_copy(update={...})` to create new settings instances with the provided credentials.

**Important Files:**
- Credential registration: [frontend/src/components/FileUpload.jsx:75-107](frontend/src/components/FileUpload.jsx#L75-L107)
- Backend credential handling: [backend/main.py:37-53](backend/main.py#L37-L53)

### File Upload Flow with Path Selection

1. User registers AWS credentials (localStorage)
2. Backend loads buckets via `/buckets` endpoint
3. Frontend displays bucket selector and folder browser
4. User navigates folders (click → updates `currentPath` state → loads objects for that prefix)
5. User selects file and clicks upload
6. File uploads to `{currentPath}/{filename}` (NOT to a request-id subfolder)
7. Upload success → reload current directory to show new file

**Path Handling:**
- Backend stores `upload_path` from request ([main.py:86](backend/main.py#L86))
- If `upload_path` provided: `{upload_path}/{filename}`
- If empty: `uploads/{filename}`

### Error Handling & Retry Logic

**Transient Error Retry ([s3_uploader.py:119-127](backend/src/services/s3_uploader.py#L119-L127)):**
- Retries on: `ThrottlingException`, `InternalError`, `ServiceUnavailable`
- Exponential backoff: 2^retry_count seconds (1s, 2s, 4s)
- Max 3 retries
- All retries logged via `StructuredLogger`

**File Validation:**
- Max size: 5GB (configurable via `max_file_size` in settings)
- Allowed MIME types defined in [config/settings.py:13-18](backend/config/settings.py#L13-L18)
- Empty file check
- File name requirement

### Structured Logging

All upload operations use `StructuredLogger` for consistent log format with request IDs:
```python
StructuredLogger.log_upload_start(request_id, filename, file_size)
StructuredLogger.log_upload_success(request_id, filename, s3_key)
StructuredLogger.log_upload_error(request_id, filename, error, retry_count)
```

### Docker & Deployment

**Docker Compose Services:**
1. `backend`: FastAPI server on port 8000
2. `frontend`: Vite dev server on port 5173 (production uses preview mode)
3. `localstack`: Local S3 for testing on port 4566

**Environment Variables:**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: Default credentials (optional if using UI input)
- `S3_BUCKET_NAME`: Default bucket (optional)
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ENDPOINT_URL_S3`: For LocalStack testing (e.g., http://localstack:4566)
- `VITE_API_URL`: Frontend build-time variable for backend URL

**Railway Deployment:**
- Deploy backend from root (uses `Dockerfile`)
- Deploy frontend from `frontend/` directory (uses `frontend/Dockerfile`)
- Set `VITE_API_URL` as build-time env var pointing to backend service URL
- Both services use Railway's injected `PORT` variable

### Key Features Implementation

**Feature Status (from copilot-instructions.md):**

✅ Implemented:
- AWS credential input form with registration/reset
- Credentials stored in localStorage (persists across refreshes)
- S3 bucket listing and selection UI
- Folder navigation within buckets
- File upload with progress bar (simulated)
- Multi-file selection with checkboxes
- Download multiple files (with per-file download state)
- Delete files with confirmation modal (requires typing "delete")

⚠️ Partially Implemented:
- Upload progress bar is simulated (see TODO at [FileUpload.jsx:279-282](frontend/src/components/FileUpload.jsx#L279-L282))
  - For real progress tracking, replace with XMLHttpRequest or implement chunked upload

❌ Not Yet Implemented:
- AWS Policy display in UI
- Firebase Analytics integration
- Real file upload progress (currently simulated)

## Important Conventions

### Backend Patterns

1. **Settings Injection**: Always use `get_settings()` for fresh settings, never cache the settings object when credentials might change
2. **S3Client Initialization**: Create new `S3Client(settings=...)` instance for each request to support dynamic credentials
3. **Error Responses**: Use `HTTPException` with descriptive messages
4. **Logging**: Always include `request_id` in structured logs

### Frontend Patterns

1. **API Calls**: All API calls must inject credentials from state:
   ```javascript
   await getBuckets(awsAccessKey, awsSecretKey)
   ```
2. **Credential State**: Check `credentialsRegistered` before making AWS-related calls
3. **Path Management**: Use `currentPath` state + `pathHistory` array for navigation
4. **File Selection**: Always clear `selectedFiles` when changing directories

### Testing Patterns

1. Use `@mock_s3` decorator for S3 operations
2. Use `monkeypatch.setenv()` for environment variables
3. Create mock buckets before testing upload operations
4. Tests don't require real AWS credentials

### Configuration

**File Size Limits:**
- Current: 5GB max for single PUT upload
- For larger files: Consider implementing multipart upload (not yet implemented)

**MIME Type Validation:**
Allowed types in [config/settings.py:13-18](backend/config/settings.py#L13-L18):
- Images: jpeg, png, gif
- Documents: pdf, plain text, markdown
- Data: json, csv, octet-stream

Add new types by updating the `allowed_mime_types` list.

### LocalStack for Local Development

Use LocalStack to test S3 operations without real AWS:

```bash
# Start LocalStack
docker-compose up localstack

# Configure backend to use LocalStack
AWS_ENDPOINT_URL_S3=http://localstack:4566

# Create test bucket (from host)
aws s3 mb s3://test-bucket --endpoint-url http://localhost:4566
```

## Future Enhancement Notes

From README.md:
- Multipart upload for files >100MB (currently single PUT max 5GB)
- CloudFront CDN integration
- SNS notifications on upload completion
- Upload history dashboard
- Real upload progress tracking (replace simulated progress)
