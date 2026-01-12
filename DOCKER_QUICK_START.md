# Docker Quick Start

## One-Liner Start

```bash
cp .env.example .env && docker-compose up
```

Then open http://localhost:5173

## Complete Setup

### 1. Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit with your credentials
# nano .env  # or use your favorite editor
```

**AWS Configuration:**
```env
AWS_ACCESS_KEY_ID=your_actual_key
AWS_SECRET_ACCESS_KEY=your_actual_secret
S3_BUCKET_NAME=your-bucket-name
```

**LocalStack Configuration (for local testing):**
```env
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET_NAME=test-bucket
AWS_ENDPOINT_URL_S3=http://localstack:4566
```

### 2. Start Services

```bash
# Start all services
docker-compose up

# Or in background
docker-compose up -d
```

### 3. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/health
- **LocalStack S3**: http://localhost:4566

### 4. Create Bucket (if using LocalStack)

```bash
docker-compose exec backend bash << 'BASH'
aws s3 mb s3://test-bucket \
  --endpoint-url http://localstack:4566 \
  --region us-east-1
BASH
```

## Common Tasks

### Run Tests

```bash
docker-compose exec backend pytest tests/
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Services

```bash
docker-compose down
```

### Clean Everything

```bash
docker-compose down -v
```

### Access Container Shell

```bash
# Backend
docker-compose exec backend /bin/bash

# Frontend
docker-compose exec frontend sh
```

### Check Service Status

```bash
docker-compose ps
```

## Using Makefile (Even Easier!)

```bash
make help       # See all commands
make build      # Build images
make up         # Start services
make test       # Run tests
make logs       # View logs
make down       # Stop services
make clean      # Remove everything
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :8000    # Backend
lsof -i :5173    # Frontend
lsof -i :4566    # LocalStack

# Kill the process
kill -9 <PID>

# Or stop docker-compose
docker-compose down
```

### Docker Daemon Not Running

Ensure Docker Desktop or Docker daemon is running.

### Out of Memory

Increase Docker memory in preferences or add to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Permission Issues on Linux

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## File Structure

```
 docker-compose.yml        # Main configuration
 docker-compose.dev.yml    # Development overrides
 Makefile                  # Convenient shortcuts
 setup.sh                  # Automated setup
 init-localstack.sh        # LocalStack init script
 DOCKER.md                 # Detailed Docker guide

 backend/
 Dockerfile           # Backend image   
 .dockerignore   
 requirements.txt   

 frontend/
 Dockerfile           # Frontend image    
 .dockerignore    
 package.json    
```

## Next Steps

1. **Run**: `docker-compose up`
2. **Test**: Open http://localhost:5173
3. **Develop**: Edit code, changes reflect immediately
4. **Deploy**: Push images to registry when ready

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

## More Information

- **DOCKER.md**: Complete Docker guide with advanced options
- **SETUP.md**: Local development without Docker
- **README.md**: Project overview and features
