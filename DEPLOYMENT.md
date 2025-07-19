# YieldRails Deployment Guide

This document provides instructions for deploying the YieldRails platform to different environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Environments](#deployment-environments)
  - [Development](#development)
  - [Staging](#staging)
  - [Production](#production)
- [Deployment Process](#deployment-process)
- [Database Migrations](#database-migrations)
- [Backup and Recovery](#backup-and-recovery)
- [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

## Prerequisites

- Docker and Docker Compose
- Node.js 18 or higher
- Access to the YieldRails Docker registry
- SSH access to deployment servers
- Required environment variables

## Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/yieldrails.git
   cd yieldrails
   ```

2. Create environment files:
   ```bash
   cp .env.example .env
   ```

3. Update the environment variables in `.env` with appropriate values for your environment.

## Deployment Environments

### Development

For local development:

```bash
docker-compose -f docker-compose.dev.yml up
```

This will start all services in development mode with hot reloading enabled.

### Staging

For staging environment:

```bash
./scripts/deployment/deploy-staging.sh
```

This script will:
- Back up the current database
- Pull the latest Docker images
- Deploy the application to the staging environment
- Run database migrations
- Verify the deployment

### Production

For production environment:

```bash
./scripts/deployment/deploy-production.sh
```

This script follows the same process as staging but uses production configurations.

## Deployment Process

The deployment process follows these steps:

1. **Backup**: Create a backup of the database and environment variables
2. **Pull**: Pull the latest Docker images
3. **Deploy**: Stop existing services and start new ones
4. **Migrate**: Run database migrations
5. **Verify**: Validate that all services are running correctly

## Database Migrations

Database migrations are automatically run during deployment. To manually run migrations:

```bash
# For staging
docker-compose -f docker-compose.staging.yml exec backend npx prisma migrate deploy

# For production
docker-compose exec backend npx prisma migrate deploy
```

## Backup and Recovery

### Creating a Backup

```bash
# For staging
./scripts/deployment/backup-restore.sh staging backup

# For production
./scripts/deployment/backup-restore.sh production backup
```

### Restoring from a Backup

```bash
# For staging (replace TIMESTAMP with the actual backup timestamp)
./scripts/deployment/backup-restore.sh staging restore TIMESTAMP

# For production (replace TIMESTAMP with the actual backup timestamp)
./scripts/deployment/backup-restore.sh production restore TIMESTAMP
```

## Monitoring and Troubleshooting

### Health Checks

```bash
# For staging
curl https://api-staging.yieldrails.com/api/health

# For production
curl https://api.yieldrails.com/api/health
```

### Logs

```bash
# For staging
docker-compose -f docker-compose.staging.yml logs -f

# For production
docker-compose logs -f
```

### Validation

To validate a deployment:

```bash
# For staging
node scripts/deployment/validate-deployment.js staging

# For production
node scripts/deployment/validate-deployment.js production
```

### Common Issues

1. **Database connection errors**:
   - Check that the database container is running
   - Verify database credentials in environment variables

2. **Redis connection errors**:
   - Check that the Redis container is running
   - Verify Redis connection string in environment variables

3. **API errors**:
   - Check API logs for detailed error messages
   - Verify that all required environment variables are set

4. **Frontend errors**:
   - Check that the API URL is correctly set in the frontend environment
   - Verify that the API is accessible from the frontend container