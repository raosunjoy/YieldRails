#!/bin/bash

# YieldRails Backup and Disaster Recovery Script
# This script handles database backups, Redis dumps, and disaster recovery procedures

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-yieldrails-prod}"
BACKUP_BUCKET="${BACKUP_BUCKET:-yieldrails-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    # Check if AWS CLI is available for S3 operations
    if ! command -v aws &> /dev/null; then
        warning "AWS CLI not found. S3 operations will be skipped."
    fi
    
    # Check if gpg is available for encryption
    if [ -n "$ENCRYPTION_KEY" ] && ! command -v gpg &> /dev/null; then
        warning "GPG not found. Backup encryption will be skipped."
    fi
    
    success "Prerequisites check completed"
}

# Create PostgreSQL backup
backup_postgresql() {
    log "Creating PostgreSQL backup..."
    
    local backup_file="postgres-backup-${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Get database credentials from secrets
    local db_user=$(kubectl get secret yieldrails-secrets -n "$NAMESPACE" -o jsonpath='{.data.DB_USER}' | base64 -d)
    local db_name=$(kubectl get secret yieldrails-secrets -n "$NAMESPACE" -o jsonpath='{.data.DB_NAME}' | base64 -d)
    
    # Create backup using pg_dump
    log "Running pg_dump for database $db_name..."
    kubectl exec -n "$NAMESPACE" deployment/postgres -- pg_dump \
        -U "$db_user" \
        -d "$db_name" \
        --no-password \
        --verbose \
        --format=custom \
        --compress=9 \
        --file="/tmp/$backup_file"
    
    # Copy backup from pod to local filesystem
    kubectl cp "$NAMESPACE/$(kubectl get pod -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}'):/tmp/$backup_file" "./$backup_file"
    
    # Compress backup
    gzip "$backup_file"
    
    # Encrypt if encryption key provided
    if [ -n "$ENCRYPTION_KEY" ]; then
        log "Encrypting backup..."
        gpg --symmetric --cipher-algo AES256 --compress-algo 2 --s2k-mode 3 \
            --s2k-digest-algo SHA512 --s2k-count 65536 \
            --passphrase "$ENCRYPTION_KEY" --batch \
            "$compressed_file"
        rm "$compressed_file"
        compressed_file="${compressed_file}.gpg"
    fi
    
    # Upload to S3 if available
    if command -v aws &> /dev/null; then
        log "Uploading PostgreSQL backup to S3..."
        aws s3 cp "$compressed_file" "s3://$BACKUP_BUCKET/postgresql/$(date +%Y/%m/%d)/$compressed_file"
        
        if [ $? -eq 0 ]; then
            success "PostgreSQL backup uploaded to S3"
        else
            error "Failed to upload PostgreSQL backup to S3"
        fi
    fi
    
    success "PostgreSQL backup completed: $compressed_file"
    echo "$compressed_file" > /tmp/postgres_backup_file
}

# Create Redis backup
backup_redis() {
    log "Creating Redis backup..."
    
    local backup_file="redis-backup-${TIMESTAMP}.rdb"
    local compressed_file="${backup_file}.gz"
    
    # Trigger Redis BGSAVE
    kubectl exec -n "$NAMESPACE" deployment/redis -- redis-cli BGSAVE
    
    # Wait for BGSAVE to complete
    log "Waiting for Redis BGSAVE to complete..."
    while true; do
        local lastsave_before=$(kubectl exec -n "$NAMESPACE" deployment/redis -- redis-cli LASTSAVE)
        sleep 2
        local lastsave_after=$(kubectl exec -n "$NAMESPACE" deployment/redis -- redis-cli LASTSAVE)
        
        if [ "$lastsave_before" != "$lastsave_after" ]; then
            break
        fi
        
        log "Still waiting for BGSAVE..."
        sleep 5
    done
    
    # Copy RDB file from Redis pod
    kubectl cp "$NAMESPACE/$(kubectl get pod -n "$NAMESPACE" -l app=redis -o jsonpath='{.items[0].metadata.name}'):/data/dump.rdb" "./$backup_file"
    
    # Compress backup
    gzip "$backup_file"
    
    # Encrypt if encryption key provided
    if [ -n "$ENCRYPTION_KEY" ]; then
        log "Encrypting Redis backup..."
        gpg --symmetric --cipher-algo AES256 --compress-algo 2 --s2k-mode 3 \
            --s2k-digest-algo SHA512 --s2k-count 65536 \
            --passphrase "$ENCRYPTION_KEY" --batch \
            "$compressed_file"
        rm "$compressed_file"
        compressed_file="${compressed_file}.gpg"
    fi
    
    # Upload to S3 if available
    if command -v aws &> /dev/null; then
        log "Uploading Redis backup to S3..."
        aws s3 cp "$compressed_file" "s3://$BACKUP_BUCKET/redis/$(date +%Y/%m/%d)/$compressed_file"
        
        if [ $? -eq 0 ]; then
            success "Redis backup uploaded to S3"
        else
            error "Failed to upload Redis backup to S3"
        fi
    fi
    
    success "Redis backup completed: $compressed_file"
    echo "$compressed_file" > /tmp/redis_backup_file
}

# Create application configuration backup
backup_configurations() {
    log "Creating configuration backup..."
    
    local config_dir="config-backup-${TIMESTAMP}"
    mkdir -p "$config_dir"
    
    # Backup ConfigMaps
    kubectl get configmap -n "$NAMESPACE" -o yaml > "$config_dir/configmaps.yaml"
    
    # Backup Secrets (without sensitive data)
    kubectl get secret -n "$NAMESPACE" -o yaml | grep -v 'data:' > "$config_dir/secrets-metadata.yaml"
    
    # Backup Deployments
    kubectl get deployment -n "$NAMESPACE" -o yaml > "$config_dir/deployments.yaml"
    
    # Backup Services
    kubectl get service -n "$NAMESPACE" -o yaml > "$config_dir/services.yaml"
    
    # Backup Ingress
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$config_dir/ingress.yaml" 2>/dev/null || true
    
    # Backup PersistentVolumeClaims
    kubectl get pvc -n "$NAMESPACE" -o yaml > "$config_dir/pvcs.yaml"
    
    # Create compressed archive
    tar -czf "${config_dir}.tar.gz" "$config_dir"
    rm -rf "$config_dir"
    
    # Encrypt if encryption key provided
    if [ -n "$ENCRYPTION_KEY" ]; then
        log "Encrypting configuration backup..."
        gpg --symmetric --cipher-algo AES256 --compress-algo 2 --s2k-mode 3 \
            --s2k-digest-algo SHA512 --s2k-count 65536 \
            --passphrase "$ENCRYPTION_KEY" --batch \
            "${config_dir}.tar.gz"
        rm "${config_dir}.tar.gz"
        config_file="${config_dir}.tar.gz.gpg"
    else
        config_file="${config_dir}.tar.gz"
    fi
    
    # Upload to S3 if available
    if command -v aws &> /dev/null; then
        log "Uploading configuration backup to S3..."
        aws s3 cp "$config_file" "s3://$BACKUP_BUCKET/configurations/$(date +%Y/%m/%d)/$config_file"
        
        if [ $? -eq 0 ]; then
            success "Configuration backup uploaded to S3"
        else
            error "Failed to upload configuration backup to S3"
        fi
    fi
    
    success "Configuration backup completed: $config_file"
}

# Restore PostgreSQL from backup
restore_postgresql() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Backup file path is required for PostgreSQL restore"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file does not exist: $backup_file"
        return 1
    fi
    
    log "Restoring PostgreSQL from backup: $backup_file"
    
    # Decrypt if needed
    if [[ "$backup_file" == *.gpg ]]; then
        if [ -z "$ENCRYPTION_KEY" ]; then
            error "Encryption key required to decrypt backup"
            return 1
        fi
        
        log "Decrypting backup..."
        gpg --decrypt --passphrase "$ENCRYPTION_KEY" --batch "$backup_file" > "${backup_file%.gpg}"
        backup_file="${backup_file%.gpg}"
    fi
    
    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        log "Decompressing backup..."
        gunzip "$backup_file"
        backup_file="${backup_file%.gz}"
    fi
    
    # Get database credentials
    local db_user=$(kubectl get secret yieldrails-secrets -n "$NAMESPACE" -o jsonpath='{.data.DB_USER}' | base64 -d)
    local db_name=$(kubectl get secret yieldrails-secrets -n "$NAMESPACE" -o jsonpath='{.data.DB_NAME}' | base64 -d)
    
    # Copy backup to postgres pod
    local postgres_pod=$(kubectl get pod -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')
    kubectl cp "$backup_file" "$NAMESPACE/$postgres_pod:/tmp/restore.sql"
    
    # Stop application pods to prevent database writes during restore
    log "Scaling down application pods..."
    kubectl scale deployment backend --replicas=0 -n "$NAMESPACE"
    kubectl scale deployment frontend --replicas=0 -n "$NAMESPACE"
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod -l app=backend -n "$NAMESPACE" --timeout=120s
    kubectl wait --for=delete pod -l app=frontend -n "$NAMESPACE" --timeout=120s
    
    # Drop and recreate database
    log "Recreating database..."
    kubectl exec -n "$NAMESPACE" "$postgres_pod" -- dropdb -U "$db_user" "$db_name" --if-exists
    kubectl exec -n "$NAMESPACE" "$postgres_pod" -- createdb -U "$db_user" "$db_name"
    
    # Restore from backup
    log "Restoring database from backup..."
    kubectl exec -n "$NAMESPACE" "$postgres_pod" -- pg_restore \
        -U "$db_user" \
        -d "$db_name" \
        --verbose \
        --clean \
        --if-exists \
        /tmp/restore.sql
    
    # Scale application pods back up
    log "Scaling up application pods..."
    kubectl scale deployment backend --replicas=3 -n "$NAMESPACE"
    kubectl scale deployment frontend --replicas=2 -n "$NAMESPACE"
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=backend -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=frontend -n "$NAMESPACE" --timeout=300s
    
    success "PostgreSQL restore completed successfully"
}

# Restore Redis from backup
restore_redis() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Backup file path is required for Redis restore"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file does not exist: $backup_file"
        return 1
    fi
    
    log "Restoring Redis from backup: $backup_file"
    
    # Decrypt if needed
    if [[ "$backup_file" == *.gpg ]]; then
        if [ -z "$ENCRYPTION_KEY" ]; then
            error "Encryption key required to decrypt backup"
            return 1
        fi
        
        log "Decrypting backup..."
        gpg --decrypt --passphrase "$ENCRYPTION_KEY" --batch "$backup_file" > "${backup_file%.gpg}"
        backup_file="${backup_file%.gpg}"
    fi
    
    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        log "Decompressing backup..."
        gunzip "$backup_file"
        backup_file="${backup_file%.gz}"
    fi
    
    # Stop Redis to replace RDB file
    log "Stopping Redis for restore..."
    kubectl scale deployment redis --replicas=0 -n "$NAMESPACE"
    kubectl wait --for=delete pod -l app=redis -n "$NAMESPACE" --timeout=120s
    
    # Copy backup to Redis volume
    # Note: This would need to be adapted based on your storage setup
    log "Copying backup to Redis volume..."
    kubectl run redis-restore --image=busybox --rm -i --restart=Never -n "$NAMESPACE" \
        --overrides='{"spec":{"volumes":[{"name":"redis-storage","persistentVolumeClaim":{"claimName":"redis-pvc"}}],"containers":[{"name":"redis-restore","image":"busybox","volumeMounts":[{"name":"redis-storage","mountPath":"/data"}],"command":["sleep","3600"]}]}}' &
    
    sleep 10
    kubectl cp "$backup_file" "$NAMESPACE/redis-restore:/data/dump.rdb"
    kubectl delete pod redis-restore -n "$NAMESPACE"
    
    # Start Redis back up
    log "Starting Redis..."
    kubectl scale deployment redis --replicas=1 -n "$NAMESPACE"
    kubectl wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=300s
    
    success "Redis restore completed successfully"
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find . -name "*backup*" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # S3 cleanup if available
    if command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        # Clean PostgreSQL backups
        aws s3 ls "s3://$BACKUP_BUCKET/postgresql/" --recursive | \
        awk -v cutoff="$cutoff_date" '$1 < cutoff {print $4}' | \
        while read -r file; do
            aws s3 rm "s3://$BACKUP_BUCKET/$file"
        done
        
        # Clean Redis backups
        aws s3 ls "s3://$BACKUP_BUCKET/redis/" --recursive | \
        awk -v cutoff="$cutoff_date" '$1 < cutoff {print $4}' | \
        while read -r file; do
            aws s3 rm "s3://$BACKUP_BUCKET/$file"
        done
        
        # Clean configuration backups
        aws s3 ls "s3://$BACKUP_BUCKET/configurations/" --recursive | \
        awk -v cutoff="$cutoff_date" '$1 < cutoff {print $4}' | \
        while read -r file; do
            aws s3 rm "s3://$BACKUP_BUCKET/$file"
        done
    fi
    
    success "Old backup cleanup completed"
}

# Disaster recovery test
test_disaster_recovery() {
    log "Running disaster recovery test..."
    
    # Create test namespace
    local test_namespace="yieldrails-dr-test"
    kubectl create namespace "$test_namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy minimal test environment
    log "Deploying test environment..."
    
    # Copy secrets to test namespace
    kubectl get secret yieldrails-secrets -n "$NAMESPACE" -o yaml | \
    sed "s/namespace: $NAMESPACE/namespace: $test_namespace/" | \
    kubectl apply -f -
    
    # Deploy test database
    kubectl apply -f k8s/postgresql.yaml -n "$test_namespace"
    kubectl wait --for=condition=ready pod -l app=postgres -n "$test_namespace" --timeout=300s
    
    # Test backup and restore
    log "Testing backup and restore procedures..."
    
    # Create test data
    local postgres_pod=$(kubectl get pod -n "$test_namespace" -l app=postgres -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n "$test_namespace" "$postgres_pod" -- psql -U postgres -d yieldrails_test -c "CREATE TABLE test_table (id SERIAL PRIMARY KEY, data TEXT);"
    kubectl exec -n "$test_namespace" "$postgres_pod" -- psql -U postgres -d yieldrails_test -c "INSERT INTO test_table (data) VALUES ('test data 1'), ('test data 2');"
    
    # Create backup
    NAMESPACE="$test_namespace" backup_postgresql
    
    # Simulate disaster by dropping table
    kubectl exec -n "$test_namespace" "$postgres_pod" -- psql -U postgres -d yieldrails_test -c "DROP TABLE test_table;"
    
    # Restore from backup
    local backup_file=$(cat /tmp/postgres_backup_file)
    NAMESPACE="$test_namespace" restore_postgresql "$backup_file"
    
    # Verify data
    local count=$(kubectl exec -n "$test_namespace" "$postgres_pod" -- psql -U postgres -d yieldrails_test -t -c "SELECT COUNT(*) FROM test_table;" | tr -d ' ')
    
    if [ "$count" = "2" ]; then
        success "Disaster recovery test passed"
    else
        error "Disaster recovery test failed - expected 2 records, got $count"
        return 1
    fi
    
    # Clean up test environment
    kubectl delete namespace "$test_namespace"
    
    success "Disaster recovery test completed successfully"
}

# Main function
main() {
    local action="${1:-backup}"
    
    case "$action" in
        "backup")
            check_prerequisites
            backup_postgresql
            backup_redis
            backup_configurations
            cleanup_old_backups
            success "Full backup completed successfully"
            ;;
        "restore-postgres")
            check_prerequisites
            restore_postgresql "$2"
            ;;
        "restore-redis")
            check_prerequisites
            restore_redis "$2"
            ;;
        "restore-full")
            check_prerequisites
            restore_postgresql "$2"
            restore_redis "$3"
            success "Full restore completed successfully"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "test-dr")
            check_prerequisites
            test_disaster_recovery
            ;;
        *)
            echo "Usage: $0 {backup|restore-postgres|restore-redis|restore-full|cleanup|test-dr} [backup-file] [redis-backup-file]"
            echo ""
            echo "Commands:"
            echo "  backup              - Create full backup of all components"
            echo "  restore-postgres    - Restore PostgreSQL from backup file"
            echo "  restore-redis       - Restore Redis from backup file"
            echo "  restore-full        - Restore both PostgreSQL and Redis"
            echo "  cleanup             - Remove old backups based on retention policy"
            echo "  test-dr             - Run disaster recovery test"
            echo ""
            echo "Environment variables:"
            echo "  NAMESPACE           - Kubernetes namespace (default: yieldrails-prod)"
            echo "  BACKUP_BUCKET       - S3 bucket for backup storage (default: yieldrails-backups)"
            echo "  RETENTION_DAYS      - Backup retention in days (default: 30)"
            echo "  ENCRYPTION_KEY      - GPG encryption passphrase (optional)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"