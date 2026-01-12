#!/bin/bash
# Initialize LocalStack with S3 bucket

echo "Waiting for LocalStack to be ready..."
sleep 10

# Create S3 bucket
echo "Creating S3 bucket..."
aws s3 mb s3://test-bucket --endpoint-url http://localstack:4566 --region us-east-1

echo "LocalStack initialization complete!"
