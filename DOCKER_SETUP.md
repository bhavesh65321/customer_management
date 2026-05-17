# Docker Setup Guide - Customer Management App

## Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose installed (comes with Docker Desktop)
- `make` utility (optional but recommended)

## Quick Start

### Option 1: Using Make (Recommended)

```bash
# Setup development environment
make setup

# View logs
make logs

# Stop everything
make down
```

### Option 2: Using Docker Compose Directly

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Services

Once running, the following services are available:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | React UI |
| Backend API | http://localhost:8000 | FastAPI |
| API Docs | http://localhost:8000/api/docs | Swagger Documentation |
| Database (MySQL) | localhost:3306 | Database |
| phpMyAdmin | http://localhost:8080 | Database Management |

---

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Execute Commands in Container

```bash
# Backend Python shell
docker-compose exec backend python

# Backend bash shell
docker-compose exec backend /bin/bash

# Run tests
docker-compose exec backend pytest

# Database shell
docker-compose exec db mysql -u app_user -papp_password customer_management_app
```

### Database Operations

```bash
# Backup database
docker-compose exec db mysqldump -u app_user -papp_password customer_management_app > backup.sql

# Restore database
docker-compose exec db mysql -u app_user -papp_password customer_management_app < backup.sql

# Create migration
docker-compose exec backend alembic revision --autogenerate -m "migration_name"

# Apply migrations
docker-compose exec backend alembic upgrade head
```

### Build Images

```bash
# Rebuild all images
docker-compose build

# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Force rebuild (no cache)
docker-compose build --no-cache
```

---

## Development Workflow

### 1. Start Services

```bash
make up
# or
docker-compose up -d
```

### 2. Make Code Changes

Code changes are automatically reloaded thanks to volume mounts:
- Backend: Changes in `./backend` are reflected immediately
- Frontend: Changes in `./frontend/src` are reflected immediately

### 3. View Logs

```bash
make logs
# or specific service
docker-compose logs -f backend
```

### 4. Run Tests

```bash
# Backend tests
docker-compose exec backend pytest

# Frontend tests
docker-compose exec frontend npm test
```

---

## Stopping and Cleanup

### Stop Services (Keep Data)

```bash
docker-compose down
```

### Remove Services and Volumes (Delete Data)

```bash
docker-compose down -v
```

### Clean Everything

```bash
make clean-all
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port in .env
BACKEND_PORT=8001
```

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Rebuild without cache
docker-compose build --no-cache backend
```

### Database Connection Error

```bash
# Make sure database is healthy
docker-compose logs db

# Wait for database to start
sleep 10

# Restart backend after database is ready
docker-compose restart backend
```

### Permission Denied Error

```bash
# Check Docker daemon
sudo systemctl start docker  # Linux
# or restart Docker Desktop  # macOS/Windows
```

---

## Production Deployment

### Build Production Images

```bash
docker-compose -f docker-compose.prod.yml build
```

### Push to Registry

```bash
docker tag customer-management-backend:latest myregistry.azurecr.io/backend:v1.0
docker push myregistry.azurecr.io/backend:v1.0

docker tag customer-management-frontend:latest myregistry.azurecr.io/frontend:v1.0
docker push myregistry.azurecr.io/frontend:v1.0
```

### Deploy to Server

```bash
# On production server
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `MYSQL_PASSWORD`: Database password
- `SECRET_KEY`: JWT secret key (change in production!)
- `REACT_APP_API_URL`: Backend URL for frontend
- `ALLOWED_ORIGINS`: CORS allowed origins

---

## Health Checks

All services have health checks configured:

```bash
# View health status
docker-compose ps
```

Health status indicators:
- `healthy` ✅ Service is working
- `unhealthy` ❌ Service has issues
- `starting` ⏳ Service is starting up

---

## Useful Make Commands

```bash
make help          # Show all available commands
make setup         # Initial setup
make up            # Start services
make down          # Stop services
make logs          # View all logs
make test          # Run all tests
make clean         # Remove containers and volumes
make shell-backend # SSH into backend container
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MySQL Docker Image](https://hub.docker.com/_/mysql)
- [Python Docker Image](https://hub.docker.com/_/python)
- [Node Docker Image](https://hub.docker.com/_/node)

---

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Review troubleshooting section above
3. Check Docker Desktop status
4. Verify `.env` file is correctly set up

---

Happy coding! 🚀
