#!/bin/bash
# Script to initialize LocalStack with S3 bucket

set -e

ENDPOINT="http://localstack:4566"
BUCKET_NAME="${S3_BUCKET_NAME:-test-bucket}"
REGION="${AWS_REGION:-us-east-1}"

echo "🔧 Initializing LocalStack S3..."
echo "Endpoint: $ENDPOINT"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack..."
for i in {1..30}; do
    if curl -s "$ENDPOINT/_localstack/health" | grep -q '"services"'; then
        echo "✅ LocalStack is ready"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

# Create S3 bucket
echo "📦 Creating S3 bucket: $BUCKET_NAME"
if aws s3 mb "s3://$BUCKET_NAME" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" 2>/dev/null || \
   aws s3 ls "s3://$BUCKET_NAME" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" > /dev/null 2>&1; then
    echo "✅ Bucket ready: $BUCKET_NAME"
else
    echo "⚠️  Could not create bucket, it may already exist"
fi

echo ""
echo "🎉 LocalStack initialization complete!"
echo ""
echo "You can now:"
echo "  - Upload files via the web UI at http://localhost:5173"
echo "  - Test S3 operations via the API at http://localhost:8000"
echo "  - View files via AWS CLI:"
echo "    aws s3 ls s3://$BUCKET_NAME --endpoint-url $ENDPOINT"
