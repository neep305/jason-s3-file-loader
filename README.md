# AWS S3 File Loader

A full-stack application for uploading files to Amazon S3 with reliable file transfers, proper error handling, and authentication.

## Features

- **File Upload**: Upload files to S3 with validation and progress tracking
- **Error Handling**: Exponential backoff retry logic for transient S3 errors
- **File Validation**: Check file size limits (5GB max) and MIME types
- **Authentication**: AWS credentials via environment variables or IAM roles
- **Structured Logging**: Request IDs for tracking uploads
- **Presigned URLs**: Temporary access links for uploaded files
- **Modern UI**: React frontend with Tailwind CSS
- **Docker Support**: Full docker-compose setup for easy deployment

## Quick Start with Docker Compose

### Prerequisites
- Docker & Docker Compose
- (Optional) AWS Account with S3 access

### Setup

1. Clone and configure:
```bash
cd /path/to/s3-file-loader
cp .env.example .env
```

2. Configure credentials in `.env`:

**Option A: Use AWS (Real S3)**
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your-bucket-name
```

**Option B: Use LocalStack (Local Testing)**
```env
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET_NAME=test-bucket
AWS_ENDPOINT_URL_S3=http://localstack:4566
```

3. Start the stack:
```bash
docker-compose up
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- LocalStack S3: http://localhost:4566

### Useful Commands

```bash
# Build images
docker-compose build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Run tests
docker-compose exec backend pytest tests/

# Stop services
docker-compose down

# Clean up everything
docker-compose down -v
```

Or use the Makefile:
```bash
make up          # Start all services
make test        # Run tests
make down        # Stop services
make help        # See all commands
```

## Project Structure

```
├── backend/
│   ├── config/
│   │   └── settings.py          # AWS and app configuration
│   ├── src/
│   │   ├── models/
│   │   │   └── upload.py        # Pydantic models
│   │   ├── services/
│   │   │   └── s3_uploader.py   # S3 client wrapper
│   │   └── utils/
│   │       └── logger.py        # Structured logging
│   ├── tests/
│   │   └── test_main.py         # API tests
│   ├── main.py                  # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── FileUpload.jsx   # Upload component
│   │   ├── utils/
│   │   │   └── api.js           # API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- AWS Account with S3 access

### Backend Setup

1. Create `.env` file in `backend/`:
```bash
cp backend/.env.example backend/.env
```

2. Fill in AWS credentials:
```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

3. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. (Optional) Set API URL in `.env.local`:
```
VITE_API_URL=http://localhost:8000
```

3. Run development server:
```bash
npm run dev
```

The UI will be available at `http://localhost:5173`

## API Endpoints

### GET /health
Health check endpoint
```bash
curl http://localhost:8000/health
```

### GET /config
Get allowed file types and size limits
```bash
curl http://localhost:8000/config
```

### POST /upload
Upload file to S3
```bash
curl -F "file=@path/to/file.txt" http://localhost:8000/upload
```

Response:
```json
{
  "success": true,
  "file_key": "uploads/request-id/filename.txt",
  "request_id": "uuid",
  "presigned_url": "https://s3.amazonaws.com/..."
}
```

## Testing

### Backend Tests

Run pytest:
```bash
cd backend
pytest tests/
```

Tests use `moto` to mock S3 responses, no AWS credentials needed.

### Key Test Cases

- Health check endpoint
- File upload validation (size, type, emptiness)
- S3 upload success
- Configuration retrieval
- Retry logic with exponential backoff

## Configuration

### File Validation
- **Max Size**: 5GB (single PUT), multipart for larger
- **Allowed MIME Types**: 
  - Images: `image/jpeg`, `image/png`, `image/gif`
  - Documents: `application/pdf`, `text/plain`
  - Data: `application/json`, `application/octet-stream`

### AWS Configuration
Set via environment variables:
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (default: us-east-1)
- `S3_BUCKET_NAME`: Target S3 bucket

## Error Handling

The application implements exponential backoff retry logic for transient AWS errors:
- `ThrottlingException`: Retry with backoff
- `InternalError`: Retry with backoff
- `ServiceUnavailable`: Retry with backoff

Max retries: 3 (configurable in `s3_uploader.py`)

## Security

- **Never log credentials**: Credentials excluded from logs
- **Presigned URLs**: Temporary access for uploaded files
- **File Validation**: MIME type checking before upload
- **CORS**: Frontend and backend on different origins
- **Request Tracking**: All uploads tracked with request IDs

## Development

### Adding New Features

1. **New S3 Operations**: Add methods to `S3Client` class in `src/services/s3_uploader.py`
2. **New Endpoints**: Add routes to `main.py`
3. **New Models**: Define in `src/models/`
4. **Frontend Components**: Add to `frontend/src/components/`

### Code Style

- Python: Follow PEP 8
- JavaScript: Use ES6+ features
- Comments: Only for complex logic

### Logging

Use the `StructuredLogger` for consistent logging:
```python
from src.utils.logger import StructuredLogger

StructuredLogger.log_upload_start(request_id, filename, file_size)
StructuredLogger.log_upload_success(request_id, filename, s3_key)
StructuredLogger.log_upload_error(request_id, filename, error, retry_count)
```

## Deployment

### AWS Lambda (Serverless)

1. Package backend as Lambda function
2. Create S3 bucket for uploads
3. Configure IAM role with S3 permissions
4. Deploy frontend to CloudFront + S3

### Traditional Server

1. Deploy backend to EC2/AppEngine
2. Configure security groups for S3 access
3. Deploy frontend to web server or CDN

### Railway (Docker)

Create two services from the same repo.

**Backend service**
1. Set **Root Directory** to repo root so it uses `Dockerfile`.
2. Add environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`
   - `AWS_ENDPOINT_URL_S3` (optional)
3. Railway injects `PORT` automatically; the backend listens on it.

**Frontend service**
1. Set **Root Directory** to `frontend` so it uses `frontend/Dockerfile`.
2. Set build env var `VITE_API_URL` to your backend URL (e.g. `https://<backend>.railway.app`).
3. Railway injects `PORT` automatically; the frontend runs `npm run preview` on it.

**Note**: `VITE_API_URL` is a build-time variable. When it changes, trigger a rebuild.

### Using LocalStack (Local Testing)

```bash
# Start LocalStack
docker-compose up localstack

# Configure AWS CLI for LocalStack
aws s3 mb s3://test-bucket --endpoint-url http://localhost:4566
```

## Troubleshooting

### "S3_BUCKET_NAME not configured"
- Set `S3_BUCKET_NAME` environment variable
- Ensure `.env` file is loaded

### "Access Denied" uploading to S3
- Verify AWS credentials are correct
- Check IAM permissions for S3:PutObject
- Verify bucket exists in configured region

### Frontend can't reach backend
- Check CORS configuration in `main.py`
- Verify backend is running on correct port
- Check `VITE_API_URL` environment variable

### File upload fails
- Check file size (max 5GB for single PUT)
- Verify MIME type is allowed
- Check S3 bucket permissions
- Review CloudWatch logs

## Future Enhancements

- [ ] Multipart upload for large files (>100MB)
- [ ] CloudFront CDN integration
- [ ] SNS notifications on upload completion
- [ ] S3 event streaming
- [ ] Dashboard with upload history
- [ ] Batch upload support
- [ ] Progress bars for large files

## License

MIT
