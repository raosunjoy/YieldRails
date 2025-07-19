#!/bin/bash
# Database backup and restore script for YieldRails

set -e

# Configuration
ENVIRONMENT=${1:-"production"}
ACTION=${2:-"backup"}
BACKUP_DIR="/opt/yieldrails/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ "$ENVIRONMENT" == "production" ]; then
  DOCKER_COMPOSE_FILE="docker-compose.yml"
  DB_NAME="yieldrails"
elif [ "$ENVIRONMENT" == "staging" ]; then
  DOCKER_COMPOSE_FILE="docker-compose.staging.yml"
  DB_NAME="yieldrails_staging"
else
  echo "❌ Invalid environment. Use 'production' or 'staging'"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup function
backup() {
  echo "📦 Creating backup for $ENVIRONMENT environment"
  
  # Create backup directory for this backup
  BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"
  mkdir -p $BACKUP_PATH
  
  # Backup database
  echo "💾 Backing up database to $BACKUP_PATH/database_backup.sql"
  docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_dump -U postgres $DB_NAME > $BACKUP_PATH/database_backup.sql
  
  # Backup Redis data
  echo "💾 Backing up Redis data to $BACKUP_PATH/redis_backup.rdb"
  docker-compose -f $DOCKER_COMPOSE_FILE exec -T redis redis-cli SAVE
  docker cp $(docker-compose -f $DOCKER_COMPOSE_FILE ps -q redis):/data/dump.rdb $BACKUP_PATH/redis_backup.rdb
  
  # Backup environment variables
  echo "🔐 Backing up environment variables to $BACKUP_PATH/.env.backup"
  cp .env $BACKUP_PATH/.env.backup
  
  echo "✅ Backup completed successfully to $BACKUP_PATH"
  echo "To restore this backup, run: $0 $ENVIRONMENT restore $TIMESTAMP"
}

# Restore function
restore() {
  RESTORE_TIMESTAMP=${3:-$TIMESTAMP}
  RESTORE_PATH="$BACKUP_DIR/$RESTORE_TIMESTAMP"
  
  if [ ! -d "$RESTORE_PATH" ]; then
    echo "❌ Backup directory $RESTORE_PATH not found"
    echo "Available backups:"
    ls -la $BACKUP_DIR
    exit 1
  fi
  
  echo "🔄 Restoring backup from $RESTORE_PATH for $ENVIRONMENT environment"
  
  # Stop services
  echo "🛑 Stopping services"
  docker-compose -f $DOCKER_COMPOSE_FILE down
  
  # Restore environment variables
  if [ -f "$RESTORE_PATH/.env.backup" ]; then
    echo "🔐 Restoring environment variables"
    cp $RESTORE_PATH/.env.backup .env
  fi
  
  # Start database and Redis
  echo "🟢 Starting database and Redis"
  docker-compose -f $DOCKER_COMPOSE_FILE up -d postgres redis
  
  # Wait for database to be ready
  echo "⏳ Waiting for database to be ready"
  sleep 10
  
  # Restore database
  if [ -f "$RESTORE_PATH/database_backup.sql" ]; then
    echo "💾 Restoring database"
    docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres psql -U postgres -c "CREATE DATABASE $DB_NAME;"
    cat $RESTORE_PATH/database_backup.sql | docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres psql -U postgres $DB_NAME
  fi
  
  # Restore Redis data
  if [ -f "$RESTORE_PATH/redis_backup.rdb" ]; then
    echo "💾 Restoring Redis data"
    docker-compose -f $DOCKER_COMPOSE_FILE stop redis
    docker cp $RESTORE_PATH/redis_backup.rdb $(docker-compose -f $DOCKER_COMPOSE_FILE ps -q redis):/data/dump.rdb
    docker-compose -f $DOCKER_COMPOSE_FILE start redis
  fi
  
  # Start all services
  echo "🟢 Starting all services"
  docker-compose -f $DOCKER_COMPOSE_FILE up -d
  
  echo "✅ Restore completed successfully"
}

# Main execution
if [ "$ACTION" == "backup" ]; then
  backup
elif [ "$ACTION" == "restore" ]; then
  restore $@
else
  echo "❌ Invalid action. Use 'backup' or 'restore'"
  echo "Usage: $0 [environment] [action] [timestamp]"
  echo "  environment: production (default) or staging"
  echo "  action: backup (default) or restore"
  echo "  timestamp: required for restore, format YYYYMMDD_HHMMSS"
  exit 1
fi