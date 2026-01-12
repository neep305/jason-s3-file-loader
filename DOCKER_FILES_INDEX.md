# Docker Files Index

Complete reference for all Docker-related files and their purposes.

## Root Level Files

### Configuration & Orchestration

| File | Purpose | Size |
|------|---------|------|
| `docker-compose.yml` | Main Docker Compose configuration with 3 services | 2.1K |
| `docker-compose.dev.yml` | Development overrides with hot reload | 409B |
| `.env.example` | Environment variables template | 241B |
| `.env` | Actual environment variables (git-ignored) | - |

### Build & Setup

| File | Purpose | Type |
|------|---------|------|
| `backend/Dockerfile` | Python 3.9 + FastAPI image | Docker |
| `backend/.dockerignore` | Excludes from backend build | Config |
| `frontend/Dockerfile` | Node 20 Alpine + Vite + React | Docker |
| `frontend/.dockerignore` | Excludes from frontend build | Config |

### Helper Scripts

| File | Purpose | Run |
|------|---------|-----|
| `setup.sh` | Automated setup with checks | `bash setup.sh` |
| `init-localstack.sh` | Initialize LocalStack S3 bucket | `bash init-localstack.sh` |
| `Makefile` | Convenient command shortcuts | `make help` |

### Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| `DOCKER_QUICK_START.md` | Quick reference guide | 5 min |
| `DOCKER.md` | Complete Docker guide | 15 min |
| `DOCKER_FILES_INDEX.md` | This file | 3 min |

---

## File Details

### docker-compose.yml

Main orchestration file defining 3 services:

```yaml
services:
  backend:       # FastAPI on port 8000
    depends_on: [localstack]
  frontend:      # React+Vite on port 5173  
    depends_on: [backend]
  localstack:    # S3 mock on port 4566
```

Features:
- Health checks for all services
- Auto-restart policy
- Shared network bridge
- Volume persistence

### docker-compose.dev.yml

Development overrides for hot reload:

```yaml
services:
  backend:
    command: uvicorn main:app --reload
  frontend:
    command: npm run dev
```

Usage:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### backend/Dockerfile

```dockerfile
FROM python:3.9-slim
RUN pip install uv
RUN uv pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

Features:
- Slim base image (smaller)
- Uses `uv` for faster installs
- Uvicorn ASGI server
- Production-ready

### frontend/Dockerfile

```dockerfile
FROM node:20-alpine
RUN npm ci
RUN npm run build
CMD ["npm", "run", "dev"]
```

Features:
- Alpine base (smaller)
- Clean install (ci)
- Production build included
- Dev server for development

### .env.example

Template for environment variables:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=

# LocalStack (optional)
# AWS_ENDPOINT_URL_S3=http://localstack:4566
```

Copy to `.env` and fill in your values.

### setup.sh

Automated setup script that:
1. Checks Docker & Docker Compose installation
2. Creates `.env` from template if missing
3. Builds Docker images
4. Provides next steps

Usage:
```bash
bash setup.sh
```

### init-localstack.sh

Initialize LocalStack S3 bucket:
1. Waits for LocalStack to be ready
2. Creates S3 bucket
3. Provides usage examples

Usage:
```bash
docker-compose exec backend bash init-localstack.sh
```

### Makefile

Convenient shortcuts for 20+ common tasks:

```bash
make help          # Show all commands
make up            # Start all services
make test          # Run backend tests
make logs          # View all logs
make down          # Stop services
make clean         # Clean everything
```

---

## Quick Reference

### Start Application

```bash
# Option 1: Simple
docker-compose up

# Option 2: Background
docker-compose up -d

# Option 3: With hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Option 4: Using Makefile
make up
```

### Access Services

```
Frontend:   http://localhost:5173
Backend:    http://localhost:8000/health
LocalStack: http://localhost:4566
```

### Common Commands

```bash
# View logs
docker-compose logs -f backend

# Run tests
docker-compose exec backend pytest tests/

# Access shell
docker-compose exec backend /bin/bash

# Stop services
docker-compose down

# Clean everything
docker-compose down -v
```

### Development

```bash
# 1. Edit files in src/
# 2. Changes auto-reload (with dev compose)
# 3. View changes in browser
# 4. No rebuild needed!
```

---

## Service Architecture

```

         Docker Compose Network          
      s3-loader-network (bridge)         

                                     
         
                                         
         yarn start
LocalStack  FrontEnd     Backend
  :   4566 :  5173 :  8000 
         
                               
          yarn start
                                 
         Uvicorn              S3 Mock
         (FastAPI)           (Testing)
```

---

## Environment Configuration

### For AWS

```env
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-production-bucket
```

### For LocalStack (Testing)

```env
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
S3_BUCKET_NAME=test-bucket
AWS_ENDPOINT_URL_S3=http://localstack:4566
```

---

## Troubleshooting

### Port Conflict

```bash
# Find what's using the port
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or stop docker-compose
docker-compose down
```

### Memory Issues

Add to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Docker Not Running

- macOS/Windows: Start Docker Desktop
- Linux: `sudo systemctl start docker`

### Permission Denied (Linux)

```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

## Next Steps

1. **Start**: `docker-compose up`
2. **Test**: Open http://localhost:5173
3. **Develop**: Edit code in `src/` directories
4. **Deploy**: Push images to registry

---

## Documentation

- **DOCKER_QUICK_START.md**: Fast reference (recommended first read)
- **DOCKER.md**: Complete guide with all options
- **SETUP.md**: Traditional local development
- **README.md**: Project overview
