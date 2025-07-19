#!/bin/bash
# Deployment script for staging environment

set -e

# Configuration
ENVIRONMENT="staging"
DOCKER_COMPOSE_FILE="docker-compose.staging.yml"
BACKUP_DIR="/opt/yieldrails/backups/$(date +%Y%m%d_%H%M%S)"

echo "🚀 Starting YieldRails deployment to $ENVIRONMENT environment"

# Create backup directory
echo "📦 Creating backup directory"
mkdir -p $BACKUP_DIR

# Backup database
echo "💾 Backing up database"
docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_dump -U postgres yieldrails_staging > $BACKUP_DIR/database_backup.sql

# Backup environment variables
echo "🔐 Backing up environment variables"
cp .env $BACKUP_DIR/.env.backup

# Pull latest images
echo "🔄 Pulling latest Docker images"
docker-compose -f $DOCKER_COMPOSE_FILE pull

# Stop services
echo "🛑 Stopping services"
docker-compose -f $DOCKER_COMPOSE_FILE down

# Start services
echo "🟢 Starting services"
docker-compose -f $DOCKER_COMPOSE_FILE up -d

# Run database migrations
echo "🗄️ Running database migrations"
docker-compose -f $DOCKER_COMPOSE_FILE exec -T backend npx prisma migrate deploy

# Verify deployment
echo "✅ Verifying deployment"
docker-compose -f $DOCKER_COMPOSE_FILE ps
curl -s http://localhost:3000/api/health | grep -q "ok" && echo "Health check passed" || echo "Health check failed"

# Clean up old Docker images
echo "🧹 Cleaning up old Docker images"
docker system prune -af

echo "✨ Deployment to $ENVIRONMENT completed successfully"