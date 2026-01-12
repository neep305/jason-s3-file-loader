# Docker Setup Guide

This project includes full Docker and Docker Compose support for easy deployment and development.

## Prerequisites

- Docker: https://docs.docker.com/get-docker/
- Docker Compose: https://docs.docker.com/compose/install/

**Note**: On macOS and Windows with Docker Desktop, use `docker compose` (with a space). On some older Linux systems, you may still use `docker-compose`.

## Quick Start

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

**For AWS S3 (Production)**:
```env
AWS_ACCESS_KEY_ID=your_actual_key
AWS_SECRET_ACCESS_KEY=your_actual_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

**For LocalStack (Local Testing)**:
```env
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
S3_BUCKET_NAME=test-bucket
AWS_ENDPOINT_URL_S3=http://localstack:4566
```

### 2. Start Services

```bash
# Start all services in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

Services will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **LocalStack Console**: http://localhost:4566

## Docker Services

### Backend (FastAPI)
- **Port**: 8000
- **Image**: Python 3.9 slim + FastAPI
- **Features**:
  - Hot reload in development
  - Pytest integration for testing
  - Health checks enabled
  - AWS/S3 connectivity

### Frontend (React + Vite)
- **Port**: 5173
- **Image**: Node 20 Alpine
- **Features**:
  - Hot module replacement (HMR)
  - Tailwind CSS integration
  - Production build capability

### LocalStack (Optional)
- **Port**: 4566 (S3 API)
- **Image**: LocalStack latest
- **Features**:
  - Local AWS S3 emulation
  - No AWS credentials needed for testing
  - Automatic initialization

## Common Commands

### Using Docker Compose Directly

```bash
# Build images
docker compose build

# Start services (foreground)
docker compose up

# Start services (background)
docker compose up -d

# Stop services
docker compose down

# Remove containers and volumes
docker compose down -v

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend

# Run tests
docker compose exec backend pytest tests/

# Open shell in container
docker compose exec backend /bin/bash
docker compose exec frontend sh

# Check status
docker compose ps
```

### Using Makefile (Shortcuts)

```bash
# See all available commands
make help

# Common commands
make build          # Build images
make up             # Start all services
make up-d           # Start in background
make down           # Stop services
make logs           # View all logs
make logs-backend   # View backend logs
make test           # Run tests
make clean          # Remove everything
make ps             # Show containers
make health         # Check service health
```

## Development Workflow

### Option 1: Hot Reload (Recommended)

```bash
# Start with development compose overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Backend auto-reloads on file changes
# Frontend hot-reloads on file changes
```

### Option 2: Direct Development (No Docker)

See `SETUP.md` for traditional local setup.

## Testing

### Run All Tests

```bash
docker compose exec backend pytest tests/ -v
```

### Run Specific Test

```bash
docker compose exec backend pytest tests/test_main.py::test_upload_file_success -v
```

### Run with Coverage

```bash
docker compose exec backend pip install pytest-cov && pytest tests/ --cov=src
```

## LocalStack S3 Testing

### Create Test Bucket

```bash
docker compose exec backend bash -c \
  "aws s3 mb s3://test-bucket --endpoint-url http://localstack:4566 --region us-east-1"
```

### Upload Test File

```bash
docker compose exec backend bash -c \
  "echo 'test content' | aws s3 cp - s3://test-bucket/test.txt --endpoint-url http://localhost:4566"
```

### List Buckets

```bash
docker compose exec backend bash -c \
  "aws s3 ls --endpoint-url http://localhost:4566"
```

## Production Build

### Frontend Production Build

```bash
docker compose exec frontend npm run build
```

Output: `frontend/dist/`

### Backend Production Image

```bash
# The default Dockerfile is production-ready
docker compose build --no-cache backend

# To customize, edit backend/Dockerfile
```

## Railway Deployment (Docker)

Railway does not use `docker-compose.yml` directly. Create two services from the same repo.

### Backend Service

1. Create a new Railway service from this repo.
2. Set **Root Directory** to repo root so it uses `Dockerfile`.
3. Add environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`
   - `AWS_ENDPOINT_URL_S3` (optional)
4. Railway injects `PORT` automatically. The backend Dockerfile listens on it.

### Frontend Service

1. Create another Railway service from the same repo.
2. Set **Root Directory** to `frontend` so it uses `frontend/Dockerfile`.
3. Set build env var `VITE_API_URL` to your backend service URL (e.g. `https://<backend>.railway.app`).
4. Railway injects `PORT` automatically. The frontend Dockerfile runs `npm run preview` on it.

### Notes

- If you want backend and frontend in a single service, add a custom Dockerfile that builds and serves both.
- `VITE_API_URL` is a build-time variable. Update it and trigger a rebuild when the backend URL changes.

## Troubleshooting

### Ports Already in Use

If ports 5173, 8000, or 4566 are in use:

```bash
# Option 1: Stop other services
docker compose down

# Option 2: Change port in docker-compose.yml
# Modify the ports section for the service
```

### Permission Denied Docker Socket

On Linux, add your user to docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### LocalStack Not Working

```bash
# Ensure LocalStack is running
docker compose logs localstack

# Check if S3 service is available
docker compose exec backend curl http://localstack:4566
```

### Container Out of Memory

Increase Docker memory limit in Docker Desktop preferences.

### Slow Build

```bash
# Clear Docker build cache
docker builder prune

# Rebuild from scratch
docker compose build --no-cache
```

## File Structure

```
.
├── docker-compose.yml          # Main compose config
├── docker-compose.dev.yml      # Development overrides
├── Makefile                    # Convenient shortcuts
├── .env.example               # Environment template
├── .dockerignore               # Files to exclude from build
│
├── backend/
│   ├── Dockerfile             # Backend image
│   ├── .dockerignore
│   └── requirements.txt
│
└── frontend/
    ├── Dockerfile             # Frontend image
    ├── .dockerignore
    └── package.json
```

## Environment Variables

All services read from `.env` file:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=          # AWS access key
AWS_SECRET_ACCESS_KEY=      # AWS secret key
AWS_REGION=us-east-1        # AWS region
S3_BUCKET_NAME=             # S3 bucket name

# For LocalStack (optional)
AWS_ENDPOINT_URL_S3=        # LocalStack endpoint
```

Frontend reads `VITE_API_URL` from docker-compose.yml.

## Network

All services communicate via `s3-loader-network` bridge network:

- `backend`: Accessible as `http://backend:8000`
- `frontend`: Accessible as `http://frontend:5173`
- `localstack`: Accessible as `http://localstack:4566`

## Health Checks

All services include health checks:

```bash
# View health status
docker compose ps

# Manual backend health check
curl http://localhost:8000/health

# Manual frontend check
curl -I http://localhost:5173
```

## Next Steps

1. Configure AWS credentials or use LocalStack
2. Run `make up` or `docker compose up`
3. Access frontend at http://localhost:5173
4. Upload files and test the application
5. Run `make test` to verify everything works
