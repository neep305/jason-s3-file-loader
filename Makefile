.PHONY: help build up down logs test clean

help:
	@echo "AWS S3 File Loader - Docker Commands"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@echo "  build          Build Docker images"
	@echo "  up             Start all services"
	@echo "  down           Stop all services"
	@echo "  logs           View logs from all services"
	@echo "  logs-backend   View backend logs"
	@echo "  logs-frontend  View frontend logs"
	@echo "  test           Run backend tests"
	@echo "  shell-backend  Open shell in backend container"
	@echo "  shell-frontend Open shell in frontend container"
	@echo "  clean          Remove containers and volumes"
	@echo "  ps             Show running containers"

build:
	docker-compose build

up:
	docker-compose up

up-d:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

test:
	docker-compose exec backend pytest tests/ -v

test-quiet:
	docker-compose exec backend pytest tests/ -q

shell-backend:
	docker-compose exec backend /bin/bash

shell-frontend:
	docker-compose exec frontend sh

clean:
	docker-compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true

ps:
	docker-compose ps

health:
	@echo "Backend health:" && curl -s http://localhost:8000/health || echo "Not running"
	@echo ""
	@echo "Frontend:" && curl -s http://localhost:5173 | head -1 || echo "Not running"
