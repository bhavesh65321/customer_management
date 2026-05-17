.PHONY: help setup build up down logs clean test lint format build-prod

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_PROD = docker-compose -f docker-compose.prod.yml
PROJECT_NAME = customer-management

help:
	@echo "Customer Management Docker Commands"
	@echo "===================================="
	@echo "Development:"
	@echo "  make setup       - Setup development environment"
	@echo "  make up          - Start all services"
	@echo "  make down        - Stop all services"
	@echo "  make restart     - Restart all services"
	@echo "  make logs        - View all logs"
	@echo "  make logs-backend - View backend logs"
	@echo "  make logs-frontend - View frontend logs"
	@echo "  make logs-db     - View database logs"
	@echo ""
	@echo "Building:"
	@echo "  make build       - Build Docker images"
	@echo "  make build-prod  - Build production images"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test        - Run all tests"
	@echo "  make test-backend - Run backend tests"
	@echo "  make test-frontend - Run frontend tests"
	@echo "  make lint        - Run linters"
	@echo "  make format      - Format code"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean       - Remove containers and volumes"
	@echo "  make clean-all   - Remove everything (images, containers, volumes)"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell    - Open MySQL shell"
	@echo "  make db-migrate  - Run database migrations"
	@echo ""
	@echo "Other:"
	@echo "  make status      - Show status of all services"
	@echo "  make shell-backend - Open backend shell"

setup:
	@echo "Setting up development environment..."
	cp .env.example .env
	$(DOCKER_COMPOSE) build
	$(DOCKER_COMPOSE) up -d db
	sleep 10
	$(DOCKER_COMPOSE) up -d backend frontend
	@echo "✅ Development environment is ready!"
	@echo "📱 Frontend: http://localhost:3000"
	@echo "🔌 Backend: http://localhost:8000"
	@echo "📊 Database: phpmyadmin at http://localhost:8080"

up:
	$(DOCKER_COMPOSE) up -d
	@echo "✅ All services are running"

down:
	$(DOCKER_COMPOSE) down
	@echo "✅ All services stopped"

restart:
	$(DOCKER_COMPOSE) restart
	@echo "✅ All services restarted"

logs:
	$(DOCKER_COMPOSE) logs -f

logs-backend:
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend:
	$(DOCKER_COMPOSE) logs -f frontend

logs-db:
	$(DOCKER_COMPOSE) logs -f db

build:
	$(DOCKER_COMPOSE) build

build-prod:
	@echo "Building production images..."
	docker build -t $(PROJECT_NAME)-backend:latest ./backend
	docker build -t $(PROJECT_NAME)-frontend:latest ./frontend
	@echo "✅ Production images built successfully"

test:
	$(DOCKER_COMPOSE) exec backend pytest
	$(DOCKER_COMPOSE) exec frontend npm test

test-backend:
	$(DOCKER_COMPOSE) exec backend pytest

test-frontend:
	$(DOCKER_COMPOSE) exec frontend npm test

lint:
	$(DOCKER_COMPOSE) exec backend pylint backend/
	$(DOCKER_COMPOSE) exec frontend npm run lint

format:
	$(DOCKER_COMPOSE) exec backend black backend/
	$(DOCKER_COMPOSE) exec frontend npm run format

status:
	$(DOCKER_COMPOSE) ps

clean:
	$(DOCKER_COMPOSE) down -v
	@echo "✅ Containers and volumes removed"

clean-all:
	$(DOCKER_COMPOSE) down -v
	docker rmi $$(docker images -q $(PROJECT_NAME)-* 2>/dev/null) 2>/dev/null || true
	@echo "✅ Everything cleaned up"

db-shell:
	$(DOCKER_COMPOSE) exec db mysql -u app_user -papp_password customer_management_app

db-migrate:
	$(DOCKER_COMPOSE) exec backend alembic upgrade head

db-backup:
	@echo "Running database backup..."
	cd backend && bash scripts/backup.sh
	@echo "✅ Backup complete. See backend/backups/ for files."

db-backup-now:
	@echo "Running immediate backup via scheduler..."
	cd backend && /Users/bhavesh.soni/Desktop/customer_management/backend/venv/bin/python3 scripts/backup_scheduler.py --now

db-restore:
	@echo "Usage: make db-restore FILE=backups/customer_management_app_TIMESTAMP.sql.gz"
	@test -n "$(FILE)" || (echo "❌ FILE not set. Use: make db-restore FILE=backups/yourfile.sql.gz" && exit 1)
	cd backend && bash scripts/restore.sh $(FILE)

shell-backend:
	$(DOCKER_COMPOSE) exec backend /bin/bash

shell-frontend:
	$(DOCKER_COMPOSE) exec frontend /bin/sh
