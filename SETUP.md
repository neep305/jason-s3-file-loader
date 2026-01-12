# Project Setup Guide

## Docker Compose Setup (Recommended)

The easiest way to run the entire stack with all services:

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your AWS credentials or LocalStack settings
# For AWS:
#   AWS_ACCESS_KEY_ID=your_key
#   AWS_SECRET_ACCESS_KEY=your_secret
#   S3_BUCKET_NAME=your-bucket-name

# For LocalStack (local testing):
#   AWS_ACCESS_KEY_ID=test
#   AWS_SECRET_ACCESS_KEY=test
#   S3_BUCKET_NAME=test-bucket
#   AWS_ENDPOINT_URL_S3=http://localstack:4566

# Start all services
docker-compose up

# In another terminal, create bucket (if using LocalStack)
docker-compose exec backend python3 -c "import boto3; s3 = boto3.client('s3', endpoint_url='http://localstack:4566', region_name='us-east-1', aws_access_key_id='test', aws_secret_access_key='test'); s3.create_bucket(Bucket='test-bucket')"

# Run tests
docker-compose exec backend pytest tests/

# Build frontend production
docker-compose exec frontend npm run build
```

Services will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- LocalStack S3: `http://localhost:4566`

### Stop all services

```bash
docker-compose down
```

### Clean up volumes (if needed)

```bash
docker-compose down -v
```

## Local Development Setup (Traditional)

### 1. Backend Setup (FastAPI)

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your AWS credentials:
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# S3_BUCKET_NAME=your-bucket-name

# Run tests
pytest tests/

# Start server
python main.py
```

Server will run on `http://localhost:8000`

### 2. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will run on `http://localhost:5173` or `http://localhost:3000`

### 3. Create S3 Bucket (if needed)

```bash
# Using AWS CLI
aws s3 mb s3://your-bucket-name --region us-east-1
```

### 4. Local Testing with LocalStack

For testing without AWS credentials:

```bash
# Install LocalStack
pip install localstack

# Start LocalStack in background
localstack start -d

# Create test bucket
aws s3 mb s3://test-bucket --endpoint-url http://localhost:4566

# Configure environment
export AWS_ENDPOINT_URL_S3=http://localhost:4566
export S3_BUCKET_NAME=test-bucket
```

## Building for Production

### Backend

```bash
cd backend
pip install -r requirements.txt
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Frontend

```bash
cd frontend
npm install
npm run build
# Output in dist/ directory
```

## Railway Deployment (Docker)

Railway does not use `docker-compose.yml` directly. Create two services from the same repo.

### Backend Service

1. Set **Root Directory** to repo root so it uses `Dockerfile`.
2. Add environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`
   - `AWS_ENDPOINT_URL_S3` (optional)
3. Railway injects `PORT` automatically; the backend listens on it.

### Frontend Service

1. Set **Root Directory** to `frontend` so it uses `frontend/Dockerfile`.
2. Set build env var `VITE_API_URL` to your backend URL (e.g. `https://<backend>.railway.app`).
3. Railway injects `PORT` automatically; the frontend runs `npm run preview` on it.

**Note**: `VITE_API_URL` is a build-time variable. When it changes, trigger a rebuild.

## Environment Variables

### Backend (.env)
```
AWS_ACCESS_KEY_ID=              # AWS access key
AWS_SECRET_ACCESS_KEY=          # AWS secret key
AWS_REGION=us-east-1            # AWS region
S3_BUCKET_NAME=                 # S3 bucket name
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000  # Backend API URL
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                         │
│              (Vite, Tailwind CSS, React 18)                │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FileUpload Component                               │  │
│  │  - File selection & drag-drop                       │  │
│  │  - Validation & progress                           │  │
│  │  - Presigned URL handling                          │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                             ↕ (REST API)
┌──────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                            │
│           (Python, boto3, moto for testing)                │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                         │  │
│  │  - POST /upload                                    │  │
│  │  - GET /config                                     │  │
│  │  - GET /health                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  S3 Client Service                                 │  │
│  │  - Upload with retry logic                        │  │
│  │  - Presigned URL generation                       │  │
│  │  - Error handling & exponential backoff           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Utilities                                          │  │
│  │  - Structured logging with request IDs            │  │
│  │  - Configuration management                       │  │
│  │  - File validation                                │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                             ↕ (boto3)
┌──────────────────────────────────────────────────────────────┐
│                    AWS S3                                    │
│              (Object storage service)                       │
└──────────────────────────────────────────────────────────────┘
```

## Key Components

### Frontend
- **FileUpload Component**: Main UI for file selection and upload
- **API Client**: Handles HTTP requests to backend
- **Styling**: Tailwind CSS for responsive design

### Backend
- **FastAPI Application**: REST API with async support
- **S3 Client Wrapper**: Manages boto3 interactions
- **Configuration Manager**: Loads AWS credentials and settings
- **Logger**: Structured logging with request IDs
- **Models**: Pydantic schemas for request/response validation

## Data Flow

1. User selects file in React UI
2. Frontend validates file (size, type)
3. Frontend sends POST request to `/upload` endpoint
4. Backend validates file again
5. Backend generates S3 key: `uploads/{request_id}/{filename}`
6. Backend uploads to S3 with retry logic
7. Backend returns response with presigned URL
8. Frontend displays success/error message

## Error Handling

- File validation errors return 400 status
- S3 errors with retry logic (exponential backoff up to 3 retries)
- Transient errors (ThrottlingException, InternalError) are retried
- Permanent errors are logged and reported
- Request IDs track each upload for debugging

## Testing Strategy

- Backend: pytest with moto for S3 mocking
- Frontend: Manual testing (can add Jest/Vitest)
- Integration: Test end-to-end with LocalStack

## Performance Considerations

- Single PUT limited to 5GB (multipart for larger)
- Exponential backoff: 1s, 2s, 4s
- Request IDs for tracing
- Structured logging for monitoring

## Security Best Practices

- Never commit `.env` files (use `.env.example`)
- Credentials from environment variables only
- Presigned URLs for temporary file access
- MIME type validation
- CORS configured for specific origins
