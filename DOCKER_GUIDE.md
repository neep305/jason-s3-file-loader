# Docker 통합 가이드

AWS S3 File Loader 프로젝트의 Docker 설정 및 운영을 위한 완전한 가이드입니다.

## 목차

1. [빠른 시작](#빠른-시작)
2. [Docker 서비스 구성](#docker-서비스-구성)
3. [환경 설정](#환경-설정)
4. [주요 명령어](#주요-명령어)
5. [개발 워크플로우](#개발-워크플로우)
6. [테스트](#테스트)
7. [LocalStack S3 테스팅](#localstack-s3-테스팅)
8. [프로덕션 빌드](#프로덕션-빌드)
9. [Railway 배포](#railway-배포)
10. [Docker 파일 구조](#docker-파일-구조)
11. [문제 해결](#문제-해결)

---

## 빠른 시작

### 원라이너로 시작하기

```bash
cp .env.example .env && docker-compose up
```

그 다음 http://localhost:5173 를 브라우저에서 엽니다.

### 단계별 설정

#### 1. 환경 변수 설정

```bash
# 템플릿 복사
cp .env.example .env

# 편집기로 .env 파일 수정
# nano .env  또는 선호하는 편집기 사용
```

**.env 파일 내용 - AWS S3 (프로덕션):**
```env
AWS_ACCESS_KEY_ID=실제_AWS_키
AWS_SECRET_ACCESS_KEY=실제_AWS_시크릿
AWS_REGION=us-east-1
S3_BUCKET_NAME=실제-버킷-이름
```

**.env 파일 내용 - LocalStack (로컬 테스팅):**
```env
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
S3_BUCKET_NAME=test-bucket
AWS_ENDPOINT_URL_S3=http://localstack:4566
```

#### 2. 서비스 시작

```bash
# 모든 서비스 시작 (foreground)
docker-compose up

# 백그라운드로 시작
docker-compose up -d

# 로그 보기
docker-compose logs -f
```

#### 3. 애플리케이션 접속

서비스 접속 URL:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/health
- **LocalStack Console**: http://localhost:4566

#### 4. LocalStack 사용 시 버킷 생성

```bash
docker-compose exec backend bash << 'BASH'
aws s3 mb s3://test-bucket \
  --endpoint-url http://localstack:4566 \
  --region us-east-1
BASH
```

---

## Docker 서비스 구성

### Backend (FastAPI)
- **포트**: 8000
- **이미지**: Python 3.9 slim + FastAPI
- **주요 기능**:
  - 개발 모드에서 hot reload 지원
  - Pytest 통합 테스팅
  - Health check 활성화
  - AWS/S3 연결

**Dockerfile 구조:**
```dockerfile
FROM python:3.9-slim
RUN pip install uv
RUN uv pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

### Frontend (React + Vite)
- **포트**: 5173
- **이미지**: Node 20 Alpine
- **주요 기능**:
  - Hot Module Replacement (HMR)
  - Tailwind CSS 통합
  - 프로덕션 빌드 기능

**Dockerfile 구조:**
```dockerfile
FROM node:20-alpine
RUN npm ci
RUN npm run build
CMD ["npm", "run", "dev"]
```

### LocalStack (Optional)
- **포트**: 4566 (S3 API)
- **이미지**: LocalStack latest
- **주요 기능**:
  - 로컬 AWS S3 에뮬레이션
  - AWS 자격증명 불필요
  - 자동 초기화

---

## 환경 설정

### 사전 요구사항

- Docker: https://docs.docker.com/get-docker/
- Docker Compose: https://docs.docker.com/compose/install/

**참고**: macOS와 Windows의 Docker Desktop에서는 `docker compose` (공백 포함)를 사용합니다. 일부 오래된 Linux 시스템에서는 `docker-compose`를 사용할 수 있습니다.

### 환경 변수 상세

모든 서비스는 `.env` 파일에서 환경 변수를 읽습니다:

```env
# AWS 설정
AWS_ACCESS_KEY_ID=          # AWS access key
AWS_SECRET_ACCESS_KEY=      # AWS secret key
AWS_REGION=us-east-1        # AWS region
S3_BUCKET_NAME=             # S3 bucket 이름

# LocalStack용 (선택사항)
AWS_ENDPOINT_URL_S3=        # LocalStack endpoint
```

Frontend는 `VITE_API_URL`을 docker-compose.yml에서 읽습니다.

---

## 주요 명령어

### Docker Compose 직접 사용

```bash
# 이미지 빌드
docker-compose build

# 서비스 시작 (foreground)
docker-compose up

# 서비스 시작 (background)
docker-compose up -d

# 서비스 중지
docker-compose down

# 컨테이너와 볼륨 모두 제거
docker-compose down -v

# 로그 보기 (실시간)
docker-compose logs -f

# 특정 서비스 로그만 보기
docker-compose logs -f backend
docker-compose logs -f frontend

# 테스트 실행
docker-compose exec backend pytest tests/

# 컨테이너 쉘 접속
docker-compose exec backend /bin/bash
docker-compose exec frontend sh

# 서비스 상태 확인
docker-compose ps
```

### Makefile 사용 (더 간편!)

```bash
# 사용 가능한 모든 명령어 보기
make help

# 자주 사용하는 명령어
make build          # 이미지 빌드
make up             # 모든 서비스 시작
make up-d           # 백그라운드로 시작
make down           # 서비스 중지
make logs           # 모든 로그 보기
make logs-backend   # Backend 로그만 보기
make logs-frontend  # Frontend 로그만 보기
make test           # 테스트 실행
make test-quiet     # 테스트 실행 (간략한 출력)
make clean          # 모든 것 제거
make ps             # 컨테이너 목록
make health         # 서비스 Health 체크
make shell-backend  # Backend 쉘 접속
make shell-frontend # Frontend 쉘 접속
```

---

## 개발 워크플로우

### 옵션 1: Hot Reload (권장)

```bash
# Development compose override와 함께 시작
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Backend는 파일 변경 시 자동 재시작
# Frontend는 파일 변경 시 hot reload
```

**docker-compose.dev.yml 내용:**
```yaml
services:
  backend:
    command: uvicorn main:app --reload
  frontend:
    command: npm run dev
```

### 옵션 2: 직접 개발 (Docker 없이)

전통적인 로컬 설정은 `SETUP.md`를 참조하세요.

### 개발 프로세스

```bash
# 1. src/ 디렉토리에서 파일 편집
# 2. 변경사항 자동 반영 (dev compose 사용 시)
# 3. 브라우저에서 변경사항 확인
# 4. 재빌드 불필요!
```

---

## 테스트

### 모든 테스트 실행

```bash
docker-compose exec backend pytest tests/ -v
```

### 특정 테스트 실행

```bash
docker-compose exec backend pytest tests/test_main.py::test_upload_file_success -v
```

### Coverage와 함께 실행

```bash
docker-compose exec backend pip install pytest-cov && pytest tests/ --cov=src
```

### 테스트 주요 케이스

Backend 테스트는 `moto`를 사용하여 S3 응답을 모킹하므로, AWS 자격증명이 필요 없습니다:

- Health check endpoint
- 파일 업로드 검증 (크기, 타입, 빈 파일)
- S3 업로드 성공
- 설정 조회
- Exponential backoff를 통한 재시도 로직

---

## LocalStack S3 테스팅

LocalStack은 실제 AWS 없이 S3 작업을 테스트할 수 있는 로컬 AWS 에뮬레이터입니다.

### 테스트 버킷 생성

```bash
docker-compose exec backend bash -c \
  "aws s3 mb s3://test-bucket --endpoint-url http://localstack:4566 --region us-east-1"
```

### 테스트 파일 업로드

```bash
docker-compose exec backend bash -c \
  "echo 'test content' | aws s3 cp - s3://test-bucket/test.txt --endpoint-url http://localhost:4566"
```

### 버킷 목록 조회

```bash
docker-compose exec backend bash -c \
  "aws s3 ls --endpoint-url http://localhost:4566"
```

### LocalStack 상태 확인

```bash
# LocalStack이 실행 중인지 확인
docker-compose logs localstack

# S3 서비스 접근 가능 여부 확인
docker-compose exec backend curl http://localstack:4566
```

---

## 프로덕션 빌드

### Frontend 프로덕션 빌드

```bash
docker-compose exec frontend npm run build
```

출력 위치: `frontend/dist/`

### Backend 프로덕션 이미지

```bash
# 기본 Dockerfile이 프로덕션에 적합합니다
docker-compose build --no-cache backend

# 커스터마이징이 필요하면 backend/Dockerfile을 수정하세요
```

### 빌드 최적화

```bash
# Docker 빌드 캐시 정리
docker builder prune

# 처음부터 재빌드
docker-compose build --no-cache
```

---

## Railway 배포

Railway는 `docker-compose.yml`을 직접 사용하지 않습니다. 같은 저장소에서 두 개의 서비스를 생성합니다.

### Backend 서비스 설정

1. 이 저장소에서 새 Railway 서비스 생성
2. **Root Directory**를 저장소 루트로 설정 (루트의 `Dockerfile` 사용)
3. 환경 변수 추가:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`
   - `AWS_ENDPOINT_URL_S3` (선택사항)
4. Railway가 자동으로 `PORT`를 주입하며, backend Dockerfile이 이를 수신합니다

### Frontend 서비스 설정

1. 같은 저장소에서 또 다른 Railway 서비스 생성
2. **Root Directory**를 `frontend`로 설정 (`frontend/Dockerfile` 사용)
3. 빌드 환경 변수 `VITE_API_URL`을 backend 서비스 URL로 설정 (예: `https://<backend>.railway.app`)
4. Railway가 자동으로 `PORT`를 주입하며, frontend Dockerfile이 `npm run preview`를 실행합니다

### 배포 참고사항

- Backend와 frontend를 단일 서비스로 배포하려면, 두 개를 모두 빌드하고 서빙하는 커스텀 Dockerfile을 추가하세요
- `VITE_API_URL`은 빌드 타임 변수입니다. Backend URL이 변경되면 rebuild를 트리거해야 합니다

---

## Docker 파일 구조

### 루트 레벨 파일

#### 설정 및 오케스트레이션

| 파일 | 목적 | 크기 |
|------|------|------|
| `docker-compose.yml` | 3개 서비스를 정의하는 메인 설정 | 2.1K |
| `docker-compose.dev.yml` | Hot reload를 위한 개발 오버라이드 | 409B |
| `.env.example` | 환경 변수 템플릿 | 241B |
| `.env` | 실제 환경 변수 (git-ignored) | - |

#### 빌드 및 셋업

| 파일 | 목적 | 타입 |
|------|------|------|
| `backend/Dockerfile` | Python 3.9 + FastAPI 이미지 | Docker |
| `backend/.dockerignore` | Backend 빌드에서 제외할 파일 | Config |
| `frontend/Dockerfile` | Node 20 Alpine + Vite + React | Docker |
| `frontend/.dockerignore` | Frontend 빌드에서 제외할 파일 | Config |

#### 헬퍼 스크립트

| 파일 | 목적 | 실행 방법 |
|------|------|-----------|
| `setup.sh` | 자동화된 셋업 스크립트 | `bash setup.sh` |
| `init-localstack.sh` | LocalStack S3 버킷 초기화 | `bash init-localstack.sh` |
| `Makefile` | 편리한 명령어 단축키 | `make help` |

### 프로젝트 디렉토리 구조

```
.
├── docker-compose.yml          # 메인 compose 설정
├── docker-compose.dev.yml      # 개발 오버라이드
├── Makefile                    # 편리한 단축키
├── .env.example                # 환경 변수 템플릿
├── .dockerignore               # 빌드에서 제외할 파일
│
├── backend/
│   ├── Dockerfile              # Backend 이미지
│   ├── .dockerignore
│   └── requirements.txt
│
└── frontend/
    ├── Dockerfile              # Frontend 이미지
    ├── .dockerignore
    └── package.json
```

### 서비스 아키텍처

```
         Docker Compose Network
      s3-loader-network (bridge)

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ LocalStack  │  │  Frontend   │  │   Backend   │
│   :4566     │  │   :5173     │  │    :8000    │
└─────────────┘  └─────────────┘  └─────────────┘
     S3 Mock         Vite Dev        Uvicorn
    (Testing)         Server         (FastAPI)
```

---

## 네트워크 구성

모든 서비스는 `s3-loader-network` bridge network를 통해 통신합니다:

- `backend`: `http://backend:8000`로 접근 가능
- `frontend`: `http://frontend:5173`로 접근 가능
- `localstack`: `http://localstack:4566`로 접근 가능

---

## Health Checks

모든 서비스에 health check가 포함되어 있습니다:

```bash
# Health 상태 보기
docker-compose ps

# 수동으로 Backend health check
curl http://localhost:8000/health

# 수동으로 Frontend check
curl -I http://localhost:5173
```

---

## 문제 해결

### 포트가 이미 사용 중

포트 5173, 8000, 또는 4566이 사용 중일 경우:

```bash
# 무엇이 포트를 사용하는지 확인
lsof -i :8000    # Backend
lsof -i :5173    # Frontend
lsof -i :4566    # LocalStack

# 프로세스 종료
kill -9 <PID>

# 또는 docker-compose 중지
docker-compose down
```

**대안**: docker-compose.yml에서 포트 변경
```yaml
services:
  backend:
    ports:
      - "8001:8000"  # 외부 포트를 8001로 변경
```

### Docker 소켓 권한 거부 (Linux)

Linux에서는 사용자를 docker 그룹에 추가:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### LocalStack이 작동하지 않음

```bash
# LocalStack이 실행 중인지 확인
docker-compose logs localstack

# S3 서비스 접근 가능 여부 확인
docker-compose exec backend curl http://localstack:4566

# Health check
curl http://localhost:4566/_localstack/health
```

### 컨테이너 메모리 부족

Docker Desktop 환경설정에서 Docker 메모리 제한을 증가시키거나, docker-compose.yml에 추가:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

### 느린 빌드

```bash
# Docker 빌드 캐시 정리
docker builder prune

# 처음부터 재빌드
docker-compose build --no-cache
```

### Docker Daemon이 실행 중이지 않음

- **macOS/Windows**: Docker Desktop 시작
- **Linux**: `sudo systemctl start docker`

---

## 헬퍼 스크립트 상세

### setup.sh

자동화된 셋업 스크립트:
1. Docker & Docker Compose 설치 확인
2. 템플릿이 없으면 `.env` 생성
3. Docker 이미지 빌드
4. 다음 단계 안내

사용법:
```bash
bash setup.sh
```

### init-localstack.sh

LocalStack S3 버킷 초기화:
1. LocalStack이 준비될 때까지 대기
2. S3 버킷 생성
3. 사용 예제 제공

사용법:
```bash
docker-compose exec backend bash init-localstack.sh
```

---

## 다음 단계

1. AWS 자격증명을 설정하거나 LocalStack 사용
2. `make up` 또는 `docker-compose up` 실행
3. http://localhost:5173 에서 Frontend 접속
4. 파일 업로드 및 애플리케이션 테스트
5. `make test` 실행하여 모든 것이 작동하는지 확인

---

## 추가 문서

- **CLAUDE.md**: AI 코딩 에이전트를 위한 프로젝트 가이드
- **SETUP.md**: Docker 없이 전통적인 로컬 개발 방법
- **README.md**: 프로젝트 개요 및 기능 설명
- **IMPLEMENTATION_SUMMARY.md**: 구현 요약
