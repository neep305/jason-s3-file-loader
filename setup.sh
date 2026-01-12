#!/bin/bash
# Quick setup script for AWS S3 File Loader

set -e

echo "🚀 AWS S3 File Loader - Setup Script"
echo "======================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "✅ .env created"
    echo ""
    echo "⚠️  Please edit .env with your AWS credentials or LocalStack settings"
    echo ""
    echo "For AWS:"
    echo "  AWS_ACCESS_KEY_ID=your_key"
    echo "  AWS_SECRET_ACCESS_KEY=your_secret"
    echo "  S3_BUCKET_NAME=your-bucket-name"
    echo ""
    echo "For LocalStack (local testing):"
    echo "  AWS_ACCESS_KEY_ID=test"
    echo "  AWS_SECRET_ACCESS_KEY=test"
    echo "  S3_BUCKET_NAME=test-bucket"
    echo "  AWS_ENDPOINT_URL_S3=http://localstack:4566"
    echo ""
    read -p "Press Enter when ready to continue..."
fi

# Build images
echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Review and update .env if needed"
echo "  2. Start services: docker-compose up"
echo "  3. Open http://localhost:5173 in your browser"
echo ""
echo "📚 For more information:"
echo "  - DOCKER.md: Docker and Docker Compose guide"
echo "  - SETUP.md: Traditional local setup guide"
echo "  - README.md: Project overview"
echo ""
