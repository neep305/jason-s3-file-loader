# AI Coding Agent Instructions for AWS S3 File Loader

## Project Overview
This is an AWS S3 file loader application designed to upload files to Amazon S3 buckets. The project focuses on reliable file transfers with proper error handling and authentication.

## Architecture
- **Core Service**: File upload handler that processes local files or streams
- **AWS Integration**: Uses AWS SDK (boto3 for Python, AWS SDK v3 for Node.js) for S3 operations
- **Data Flow**: Input files → Validation → Upload to S3 → Response/Logging
- **Key Components**: 
  - File processor
  - S3 client wrapper
  - Configuration manager
  - Error handler with retry logic

## Critical Workflows
- **Authentication**: Use AWS credentials via environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) or IAM roles
  - Provide loading AWS crendetials using key or ACESS_KEY_ID, AWS_SECRET_ACCESS_KEY on the input form
- **Build**: Standard package manager commands (`pip install` for Python, `npm install` for Node.js)
- **Test**: Run tests with `pytest` (Python) or `npm test` (Node.js); focus on mocking S3 calls
- **Deploy**: Use AWS CLI for bucket setup; consider Lambda for serverless deployment
- **Debug**: Check CloudWatch logs for S3 errors; use localstack for testing S3 locally

## Project Conventions
- **Error Handling**: Implement exponential backoff for transient S3 errors (ThrottlingException, InternalError)
- **File Validation**: Check file size limits (5GB for single PUT) and MIME types before upload
- **Logging**: Use structured logging with request IDs for tracking uploads
- **Configuration**: Store bucket names and regions in config files or environment variables
- **Security**: Never log credentials; use presigned URLs for temporary access when needed

## Integration Points
- **AWS Services**: Primary S3, possibly CloudFront for CDN, SNS for notifications
- **External Dependencies**: AWS SDK packages; consider using `boto3-stubs` for type hints in Python
- **Cross-Component**: Use event-driven patterns for upload status updates

## Code Patterns
- **S3 Client**: Initialize once and reuse; configure region and signature version
- **Multipart Upload**: For files >100MB, use multipart upload with progress tracking
- **Bucket Policies**: Ensure proper permissions for upload operations
- **Testing**: Mock S3 responses using `moto` (Python) or `aws-sdk-mock` (Node.js)

## Framework
- Frontend: React, Tailwind
- Backend: FastAPI, UV 활용한 의존성 관리
- Docker: 추후 재활용이 가능하도록 docker image로 빌드. docker-compose 활용하도록 프로젝트 구성

## 세부기능 구현
**세부기능은 아래 가이드를 참고하여 백엔드, 프론트엔드를 함께 개발한다."
- AWS에서 현재 계정에 부여된 권한 Policy를 UI에 보여준다.
- AWS 현재 연결된 계정의 S3 Bucket이 UI에서 보이도록 디스플레이 제공
- 유저가 UI에서 S3 Bucket 목록 조회 후 변경 가능하도록 기능 제공
- Bucket 아래 경로 선택 후 업로드 가능하도록 기능 제공. 중간에 임의의 경로는 생성하지 않도록 함
- UI에서 파일업로드 시 로딩바를 통해 올라가는 퍼센티지를 보여주도록 함
- 동적으로 다른 계정의 AWS S3환경에 사용할 수 있도록 AWS KEY, SECRET을 입력하는 input 폼을 추가한다. 입력 후 '등록' 버튼을 클릭하면 변경하기 전까지 유지되도록 하고, '초기화'를 누르면 다시 입력창을 활성화하도록 수정한다. 등록 시 '로컬스토리지'에 저장하여 새로고침을 하더라도 환경이 유지되도록 한다.
- S3 버킷 내 파일 다중 선택: 
  - 다운로드 기능: 다중 선택 시 "다운로드" 버튼 활성화. 클릭시 설정한 로컬경로에 다운로드 진행. 다운로드시에도 파일별 다운로드 로딩바 활성화.
  - 삭제 기능: S3권한이 있을 경우에만 활성화한다. 다중 선택시 "다운로드" 버튼 옆에 "삭제" 버튼 활성화. 다운로드는 실수하면 안되므로 삭제 클릭시 "삭제를 원하시면 아래 입력창에 delete를 입력 후 확인 버튼을 누르세요"라고 구성하고, '확인', '취소' 버튼을 아래에 보이도록 한다.
- Firebase Analytics 연동하여 사용자가 어떤 S3버킷에 접속하여 파일업로드, 다운로드, 삭제를 몇 번 했는지 통계 수집


Reference key files as they are created (e.g., `src/s3_uploader.py`, `config/settings.py`).